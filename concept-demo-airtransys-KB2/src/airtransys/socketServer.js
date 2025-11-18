export function connectWS(url, onMessage) {
  let ws;

  function connect() {
    ws = new WebSocket(url);

    ws.onopen = () => console.log("Connected");

    ws.onmessage = (e) => {
      if (onMessage) onMessage(e.data); // <-- xử lý message ở đây
    };

    ws.onclose = () => {
      console.warn("Disconnected, retry in 2s...");
      setTimeout(connect, 2000);
    };

    ws.onerror = () => ws.close();
  }

  connect();
  return () => ws; // getWebSocket()
}
