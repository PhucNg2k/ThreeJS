# Thế Giới Ảo Tương Tác: Showroom và Lái Xe 3D

Một ứng dụng web 3D được xây dựng bằng **Three.js**, mang đến trải nghiệm toàn diện cho người dùng: từ việc tự do khám phá một showroom xe hơi, tùy chỉnh chi tiết ngoại hình xe, cho đến lái thử trong một môi trường thành phố sống động.

## A. Giới thiệu đồ án

Đồ án này là một thế giới ảo thu nhỏ trên nền tảng web, nơi người dùng có thể tương tác với các mẫu xe 3D chất lượng cao. Trải nghiệm được chia thành 3 khu vực (scene) chính, liên kết chặt chẽ với nhau:

1.  **Showroom:** Sảnh chính nơi người dùng điều khiển nhân vật để khám phá, ngắm nhìn các mẫu xe được trưng bày.
2.  **Podium (Bục trưng bày):** Không gian chuyên nghiệp để tùy chỉnh sâu ngoại hình của chiếc xe đã chọn, bao gồm việc thay đổi vật liệu và áp dụng "skin" từ ảnh do người dùng tải lên.
3.  **Driving (Lái xe):** Môi trường thành phố 3D để người dùng có thể trải nghiệm cảm giác lái thử chiếc xe.

## B. Các chức năng chính

*   **Khám phá Showroom 3D:**
    *   Điều khiển nhân vật góc nhìn thứ ba (third-person) hoặc camera bay tự do (fly-cam) để khám phá không gian.
    *   Tương tác với các mẫu xe bằng kỹ thuật Raycasting, làm nổi bật đối tượng và hiển thị menu lựa chọn.
    *   Hệ thống phân luồng, cho phép người dùng chuyển đến scene "Tùy chỉnh" hoặc "Lái thử".
    *   Tích hợp Minimap để theo dõi vị trí nhân vật.

*   **Tùy chỉnh xe chi tiết (Podium):**
    *   **Tính năng độc đáo:** Cho phép người dùng tệp cá nhân** lên để áp dụng làm skin (texture) cho xe và bục trưng bày.
    *   Tinh chỉnh các thuộc tính vật liệu PBR như Độ nhám (Roughness) và Độ kim loại (Metalness) thông qua giao diện GUI.
    *   Điều khiển vị trí, góc xoay của xe và bật chế độ tự động xoay để quan sát toàn diện.
    *   Tùy chỉnh môi trường (skybox) và cường độ ánh sáng phản chiếu.

*   **Mô phỏng Lái xe (Driving):**
    *   Cơ chế vật lý lái xe cơ bản: tăng tốc, phanh, và rẽ.
    *   Camera theo dõi thông minh, tự động bám theo xe và có hiệu ứng nghiêng khi vào cua.
    *   Giao diện **HUD (Heads-Up Display)** hiển thị đồng hồ tốc độ và bản đồ nhỏ.
    *   Tích hợp trình phát nhạc nền và tính năng chuyển đổi linh hoạt giữa các bản đồ thành phố.

## C. Công nghệ sử dụng

*   **Nền tảng chính:** JavaScript (ES6+), HTML5, CSS3.
*   **Thư viện đồ họa:** **Three.js** (r120+)
*   **Các module và thư viện hỗ trợ:**
    *   `GLTFLoader`, `FBXLoader`: Để tải và xử lý các mô hình 3D.
    *   `OrbitControls`, `PointerLockControls`: Để xử lý cơ chế điều khiển camera và nhân vật.
    *   `lil-gui`: Để tạo các panel giao diện cài đặt.
    *   `Stats.js`: Để theo dõi hiệu năng (FPS).

## 3. Hướng dẫn Cài đặt và Chạy đồ án

Để chạy dự án này trên máy cục bộ, bạn cần một môi trường server đơn giản để tránh các lỗi liên quan đến chính sách CORS của trình duyệt khi tải tài nguyên 3D.

### Yêu cầu
*   [Node.js](https://nodejs.org/) và `npm` đã được cài đặt.

### Các bước thực hiện

1.  **Clone repository về máy của bạn:**
    ```bash
    git clone https://github.com/PhucNg2k/ThreeJS.git
    ```

2.  **Di chuyển vào thư mục repo:**
    ```bash
    cd ThreeJS
    ```

3.  **Cài đặt nodeJS và chạy các lệnh sau:**
-  Download packages
    ```bash
    npm install
    ```
-  Start projects
    ```bash
    npm run dev
    ```


4.  **Truy cập ứng dụng:**
    Mở trình duyệt của bạn và truy cập vào địa chỉ được cung cấp (`http://localhost:8080`).

## Video Demo sản phẩm


[Link video](https://drive.google.com/file/d/1waQZScfFFjmbKAGCnKNBXasN4mR-gMPq/view?fbclid=IwY2xjawLC61VleHRuA2FlbQIxMQABHi4jzmVfSRFVPYHyeZPeoUTUVHG4Sq03VYim7Ul7CYNh4T4TngtIV0TSQdGv_aem_YIo6y_pT48lnPesHuAri4A)


## D. Thành viên nhóm

| Họ và Tên            | MSSV       |
| -------------------- | ---------- |
| Nguyễn Quang Huy     | `22520564` |
| Trần Hà Sơn          | `22521259` |
| Nguyễn Thượng Phúc   | `22521134` |
| Nguyễn Thanh Hùng    | `22520518` |
