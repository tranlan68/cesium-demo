export function connectWS(
    url: string,
    onMessage?: (data: string) => void
  ): () => WebSocket | undefined {
    let ws: WebSocket | undefined;
  
    function connect() {
      ws = new WebSocket(url);
  
      ws.onopen = () => console.log("Connected to", url);
  
      ws.onmessage = (event: MessageEvent) => {
        if (onMessage) onMessage(event.data);
      };
  
      ws.onclose = () => {
        console.warn("Disconnected, retry in 2s...");
        setTimeout(connect, 2000);
      };
  
      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        ws?.close();
      };
    }
  
    connect();
  
    // Trả về hàm để lấy WebSocket hiện tại
    return () => ws;
  }