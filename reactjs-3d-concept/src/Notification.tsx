import { useEffect } from "react";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";


interface NotificationProps {
  containerId?: string;
}

const Notification: React.FC<NotificationProps> = ({
    containerId = "cesiumContainer",
  }) => {
  useEffect(() => {
    const content = `
    <div style="position: relative; display:flex; justify-content: space-between; align-items: top;">
    <div>
    Mô phỏng tình huống tăng độ cao để tránh va chạm giữa 2 drone tại Khu Công nghệ cao Hòa Lạc <br>
    Tọa độ các điểm: <br>
      - P1: 21.003083, 105.537444 <br>
      - P2: 21.001667, 105.538028 <br>
      - P3: 21.00075, 105.536027 <br>
      - P4: 21.001833, 105.535333 <br>
    Thông tin bay: <br>
      - Drone A: Cất cánh tại điểm P1, tăng dần độ cao lên 25m. Đi qua các điểm P2, P3, P4 và trở về P1 <br>
      - Drone B: Cất cánh sau Drone A 5s, tại điểm P1, tăng dần độ cao lên 25m. Đi qua các điểm P4, P3, P2 và trở về P1 <br>
    </div>
    <button id="closeToast" style="
      position: absolute;
      top: -6px;
      right: -6px;
      background: transparent;
      color: #e53935;
      border: none;
      font-weight: bold;
      font-size: 16px;
      cusor: pointer;
    ">X</button>
  </div>
    `;

    const container = document.getElementById(containerId);
    if (!container) return;

    const toast = Toastify({
      node: (() => {
        const div = document.createElement("div");
        div.innerHTML = content;
        const btn = div.querySelector("#closeToast");
        btn?.addEventListener("click", () => toast.hideToast());
        return div;
      })(),
      duration: -1,
      gravity: "bottom",
      position: "left",
      style: {
        background: "linear-gradient(to right, #00b09b, #96c93d)",
        fontSize: "14px",
      },
    });

    toast.showToast();

    return () => toast.hideToast(); // cleanup khi unmount
  }, [containerId]);

  return null; // chỉ dùng để trigger toast
}

export default Notification;