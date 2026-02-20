import { createContext, useContext, useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || '';

type WebSocketContextType = {
  orderUpdateTrigger: number;
  taskUpdateTrigger: number;
  connected: boolean;
};

const WebSocketContext = createContext<WebSocketContextType>({
  orderUpdateTrigger: 0,
  taskUpdateTrigger: 0,
  connected: false,
});

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [orderUpdateTrigger, setOrderUpdateTrigger] = useState(0);
  const [taskUpdateTrigger, setTaskUpdateTrigger] = useState(0);

  useEffect(() => {
    const s = io(WS_URL);
    setSocket(s);

    s.on('connect', () => {
      setConnected(true);
      s.emit('subscribe:orders');
    });

    s.on('disconnect', () => setConnected(false));

    s.on('order:updated', () => {
      setOrderUpdateTrigger((n) => n + 1);
    });

    s.on('task:updated', () => {
      setTaskUpdateTrigger((n) => n + 1);
    });

    return () => {
      s.close();
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{ orderUpdateTrigger, taskUpdateTrigger, connected }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
