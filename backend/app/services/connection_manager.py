"""In-memory connection manager for session-scoped WebSockets.

Maintains active WebSocket connections for admins and participants,
providing thread-safe / asyncio-safe broadcasting and client message delivery.
"""

import asyncio
import json
import logging
from typing import Any
from fastapi import WebSocket

logger = logging.getLogger("game_connection_manager")


class GameConnectionManager:
    """Manages active WebSockets segmented by session_id and role/team."""

    def __init__(self) -> None:
        # session_id -> list of (WebSocket, metadata_dict)
        self._connections: dict[str, list[tuple[WebSocket, dict[str, Any]]]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, session_id: str, websocket: WebSocket, metadata: dict[str, Any]) -> None:
        """Register and accept an authenticated WebSocket connection."""
        await websocket.accept()
        async with self._lock:
            if session_id not in self._connections:
                self._connections[session_id] = []
            self._connections[session_id].append((websocket, metadata))
        logger.info(
            f"WS Connected to session {session_id}: role={metadata.get('role')} team={metadata.get('team_id')}"
        )

    async def disconnect(self, session_id: str, websocket: WebSocket) -> None:
        """Unregister a WebSocket connection."""
        async with self._lock:
            if session_id in self._connections:
                self._connections[session_id] = [
                    (ws, meta) for ws, meta in self._connections[session_id] if ws != websocket
                ]
                if not self._connections[session_id]:
                    del self._connections[session_id]
        logger.info(f"WS Disconnected from session {session_id}")

    async def broadcast_to_session(
        self,
        session_id: str,
        event: str,
        data: dict[str, Any],
        exclude_ws: WebSocket | None = None,
    ) -> None:
        """Broadcast an event payload to all connected clients in a session."""
        message_str = json.dumps({"event": event, "data": data})
        stale_sockets: list[WebSocket] = []

        async with self._lock:
            sockets = list(self._connections.get(session_id, []))

        for ws, _ in sockets:
            if ws == exclude_ws:
                continue
            try:
                await ws.send_text(message_str)
            except Exception:
                stale_sockets.append(ws)

        if stale_sockets:
            async with self._lock:
                if session_id in self._connections:
                    self._connections[session_id] = [
                        (ws, meta) for ws, meta in self._connections[session_id] if ws not in stale_sockets
                    ]

    async def send_to_role(
        self,
        session_id: str,
        role: str,
        event: str,
        data: dict[str, Any],
    ) -> None:
        """Send message only to connections with specific role ('admin' or 'participant')."""
        message_str = json.dumps({"event": event, "data": data})
        async with self._lock:
            sockets = list(self._connections.get(session_id, []))

        for ws, meta in sockets:
            if meta.get("role") == role:
                try:
                    await ws.send_text(message_str)
                except Exception:
                    pass

    async def send_to_team(
        self,
        session_id: str,
        team_id: str,
        event: str,
        data: dict[str, Any],
    ) -> None:
        """Send message to all connections belonging to a specific team."""
        message_str = json.dumps({"event": event, "data": data})
        async with self._lock:
            sockets = list(self._connections.get(session_id, []))

        for ws, meta in sockets:
            if meta.get("team_id") == team_id:
                try:
                    await ws.send_text(message_str)
                except Exception:
                    pass

    async def send_direct(
        self,
        websocket: WebSocket,
        event: str,
        data: dict[str, Any],
    ) -> None:
        """Send message directly to a single connection."""
        message_str = json.dumps({"event": event, "data": data})
        try:
            await websocket.send_text(message_str)
        except Exception:
            pass


# Global singleton manager
ws_manager = GameConnectionManager()
