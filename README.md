<p align="center">
  <img src="https://raw.githubusercontent.com/homielab/giapha-os/main/public/icon.png" alt="Gia Phả OS Icon" width="100" height="100" style="border-radius: 22%; border: 0.5px solid rgba(0,0,0,0.1);" />
</p>

# Gia Phả OS (Gia Phả Open Source)

Đây là mã nguồn mở cho ứng dụng quản lý gia phả dòng họ, cung cấp giao diện trực quan để xem sơ đồ phả hệ, quản lý thành viên và tìm kiếm danh xưng.

Dự án ra đời từ nhu cầu thực tế: cần một hệ thống Cloud để con cháu ở nhiều nơi có thể cùng cập nhật thông tin (kết hôn, sinh con...), thay vì phụ thuộc vào một máy cục bộ. Việc tự triển khai mã nguồn mở giúp gia đình bạn nắm trọn quyền kiểm soát dữ liệu nhạy cảm, thay vì phó mặc cho các dịch vụ bên thứ ba. Ban đầu mình chỉ làm cho gia đình sử dụng, nhưng vì được nhiều người quan tâm nên mình quyết định chia sẻ công khai.

Phù hợp với người Việt Nam.

## Mục lục

- [Các tính năng chính](#các-tính-năng-chính)
- [Demo](#demo)
- [Hình ảnh Giao diện](#hình-ảnh-giao-diện)
- [Cài đặt và Chạy dự án](#cài-đặt-và-chạy-dự-án)
  - [Cách 1: Deploy nhanh lên Vercel](#cách-1-deploy-nhanh-lên-vercel)
  - [Cách 2: Chạy trên máy cá nhân](#cách-2-chạy-trên-máy-cá-nhân)
- [Đăng nhập](#đăng-nhập)
- [Đóng góp (Contributing)](#đóng-góp-contributing)
- [Tuyên bố từ chối trách nhiệm & Quyền riêng tư](#tuyên-bố-từ-chối-trách-nhiệm--quyền-riêng-tư)
- [Giấy phép (License)](#giấy-phép-license)

## Các tính năng chính

- **Sơ đồ trực quan**: Xem gia phả dạng Cây (Tree) và Sơ đồ tư duy (Mindmap).
- **Tìm danh xưng**: Tự động xác định cách gọi tên (Bác, Chú, Cô, Dì...) chính xác.
- **Quản lý thành viên**: Lưu trữ thông tin, avatar và sắp xếp thứ tự nhánh dòng họ.
- **Quản lý quan hệ**: Quản lý các mối quan hệ trong gia phả (hỗ trợ các trường hợp đặc biệt như đa thê, đa phu,...).
- **Thống kê & Sự kiện**: Theo dõi ngày giỗ và các chỉ số nhân khẩu học của dòng họ.
- **Sao lưu dữ liệu**: Xuất/nhập file JSON, CSV, GEDCOM để lưu trữ hoặc di chuyển dễ dàng.
- **Đăng nhập Google**: Đăng nhập nhanh, không cần quản lý mật khẩu; ai đăng nhập cũng có quyền cập nhật gia phả như nhau.
- **Đa thiết bị**: Giao diện hiện đại, tối ưu cho cả máy tính và điện thoại.

## Demo

- Demo: [giapha-os.homielab.com](https://giapha-os.homielab.com)
- Đăng nhập bằng tài khoản Google bất kỳ.

## Hình ảnh Giao diện

![Dashboard](docs/screenshots/dashboard.png)

![Danh sách](docs/screenshots/list.png)

![Sơ đồ cây](docs/screenshots/tree.png)

![Mindmap](docs/screenshots/mindmap.png)

![Mindmap](docs/screenshots/stats.png)

![Mindmap](docs/screenshots/kinship.png)

![Mindmap](docs/screenshots/events.png)

More screenshots: [docs/screenshots/](docs/screenshots/)

## Cài đặt và Chạy dự án

Chỉ cần khoảng 10 -> 15 phút là bạn có thể tự dựng hệ thống gia phả cho gia đình mình.

---

## 1. Tạo Database (Miễn phí với Neon)

1. Tạo tài khoản miễn phí tại https://github.com nếu chưa có.
2. Vào [Vercel Dashboard](https://vercel.com) → **Storage → Create Database → Neon** (hoặc tạo trực tiếp tại https://neon.tech).
3. Lấy **connection string** (bản pooled) — đây là giá trị `DATABASE_URL` dùng ở bước sau.

## 2. Tạo Google OAuth (đăng nhập)

1. Vào [Google Cloud Console](https://console.cloud.google.com) → tạo project mới.
2. **OAuth consent screen**: chọn *External*, điền thông tin cơ bản rồi **Publish**.
3. **Credentials → Create OAuth Client ID → Web application**. Thêm **Authorized redirect URIs**:
   - `https://your-domain.vercel.app/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (nếu chạy local)
4. Lưu lại **Client ID** và **Client Secret**.

---

## Cách 1: Deploy nhanh lên Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhomielab%2Fgiapha-os&env=SITE_NAME,DATABASE_URL,AUTH_SECRET,AUTH_GOOGLE_ID,AUTH_GOOGLE_SECRET)

1. Tạo tài khoản miễn phí tại https://vercel.com nếu chưa có (khuyên dùng đăng ký bằng tài khoản GitHub cho nhanh).
2. Nhấn nút Deploy bên trên.
3. Điền các biến môi trường đã lưu ở **bước 1, 2**, cộng thêm `AUTH_SECRET` (sinh bằng `openssl rand -base64 32`).
4. Vào **Storage → Create → Blob** để tạo Vercel Blob (dùng lưu ảnh), liên kết vào project — token `BLOB_READ_WRITE_TOKEN` sẽ tự thêm vào env.
5. Nhấn **Deploy** và chờ 2 -> 3 phút.

Bạn sẽ có một đường link website để sử dụng ngay. Mở trang `/setup` để lấy SQL khởi tạo cấu trúc bảng và chạy trong **Neon SQL Editor**.

---

## Cách 2: Chạy trên máy cá nhân

Yêu cầu: máy đã cài [Node.js](https://nodejs.org/en) và [Bun](https://bun.sh/)

1. Clone hoặc tải project về máy.
2. Đổi tên file `.env.example` thành `.env.local`.
3. Mở file `.env.local` và điền các giá trị đã lưu ở **bước 1, 2**.

```env
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.neon.tech/neondb?sslmode=require"
AUTH_SECRET="your-random-secret"
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
BLOB_READ_WRITE_TOKEN="your-blob-token"
```

4. Cài thư viện

```bash
bun install
```

5. Chạy dự án

```bash
bun run dev
```

Mở trình duyệt và truy cập: `http://localhost:3000`

---

## Đăng nhập

- Đăng nhập bằng tài khoản Google — không cần đăng ký, không cần quản lý mật khẩu.
- Bất kỳ ai đăng nhập cũng có quyền xem và cập nhật gia phả như nhau (không phân quyền).

Nếu gặp lỗi khi đăng nhập, kiểm tra lại **Authorized redirect URIs** trong Google Cloud Console đã khớp đúng domain thực tế của bạn (xem [bước 2](#2-tạo-google-oauth-đăng-nhập)) chưa.

## Đóng góp (Contributing)

Dự án này là mã nguồn mở, hoan nghênh mọi đóng góp, báo cáo lỗi (issues) và yêu cầu sửa đổi (pull requests) để phát triển ứng dụng ngày càng tốt hơn.

## Tuyên bố từ chối trách nhiệm & Quyền riêng tư

> **Dự án này chỉ cung cấp mã nguồn (source code). Không có bất kỳ dữ liệu cá nhân nào được thu thập hay lưu trữ bởi tác giả.**

- **Tự lưu trữ hoàn toàn (Self-hosted):** Khi bạn triển khai ứng dụng, toàn bộ dữ liệu gia phả (tên, ngày sinh, quan hệ, thông tin liên hệ...) được lưu trữ **trong cơ sở dữ liệu Neon của chính bạn**. Tác giả dự án không có quyền truy cập vào database đó.

- **Không thu thập dữ liệu:** Không có analytics, không có tracking, không có telemetry, không có bất kỳ hình thức thu thập thông tin người dùng nào được tích hợp trong mã nguồn.

- **Bạn kiểm soát dữ liệu của bạn:** Mọi dữ liệu gia đình, thông tin thành viên đều nằm hoàn toàn trong cơ sở dữ liệu Neon mà bạn tạo và quản lý. Bạn có thể xóa, xuất hoặc di chuyển dữ liệu bất cứ lúc nào.

- **Demo công khai:** Trang demo tại `giapha-os.homielab.com` sử dụng dữ liệu mẫu hư cấu, không chứa thông tin của người thật. Không nên nhập thông tin cá nhân thật vào trang demo.

## Giấy phép (License)

Dự án được phân phối dưới giấy phép MIT.
