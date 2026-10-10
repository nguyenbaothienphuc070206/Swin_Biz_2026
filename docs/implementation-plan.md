# Kế hoạch triển khai Nhà Gần theo lát cắt dọc

Mỗi lát đi qua giao diện → API/server → Supabase/RLS → kết quả hiển thị. Với từng lát, thứ tự bắt buộc là: viết test trước, xác nhận test thất bại đúng lý do, triển khai, chạy test lát đó và regression suite, rồi commit. Sau mỗi lát sẽ dừng và báo cáo; chỉ tiếp tục lát kế tiếp khi người dùng yêu cầu.

## Lát 1 — Đăng nhập và tạo hồ sơ gia đình

**Luồng:** người dùng đăng nhập/đăng ký bằng Supabase Auth → tạo hồ sơ gia đình → thành viên và chủ gia đình được ghi trong cùng giao dịch → trang tổng quan gia đình hiện dữ liệu đã lưu.

**Test viết trước:** test component/flow Auth; test route tạo gia đình; test Postgres/RLS chứng minh chủ gia đình đọc được gia đình mình, người dùng khác không đọc được, và client không tự đổi role/chủ sở hữu.

**Cài đặt:** App Router + Tailwind khung tiếng Việt mobile-first; Supabase SSR/Auth; schema và RLS sau khi được duyệt; form đăng nhập, tạo gia đình và trạng thái lỗi/thành công.

**Điều kiện hoàn tất:** đăng nhập được, tạo gia đình được, refresh vẫn thấy đúng dữ liệu, tài khoản khác bị RLS chặn.

**Cổng quyết định trước migration:** phương thức đăng nhập và schema/profile fields phải theo `docs/spec.md` hoặc được người dùng duyệt. Tài liệu này chưa có trong workspace.

## Lát 2 — Người chăm check-in lượt thăm

**Luồng:** người chăm đăng nhập → xem lượt được phân công → check-in và ghi dữ liệu theo biểu mẫu một tay → lưu vào Supabase/RLS → nhận trạng thái đã lưu.

**Test viết trước:** chỉ người chăm được phân công mới ghi được; check-in lặp không tạo bản sao; kiểm tra giá trị/đơn vị; lưu offline và đồng bộ lại không mất/nhân đôi dữ liệu.

**Cài đặt:** màn hình ít chữ với nút lớn; route kiểm tra phiên và phân công; ghi nhận lượt thăm/chỉ số/nhật ký thuốc; hàng đợi cục bộ cho mạng yếu.

**Điều kiện hoàn tất:** dữ liệu hiện lại sau tải trang, lượt không phân công bị từ chối, đồng bộ lại có tính idempotent.

## Lát 3 — Báo cáo, tóm tắt AI và gửi Zalo

**Luồng:** lượt thăm hoàn tất → ghi report/event → worker gọi Claude server-side → kiểm tra JSON và guardrail → lưu tóm tắt → gửi Zalo OA → lưu trạng thái giao nhận.

**Test viết trước:** outbox retry/idempotency; schema và test cấm chẩn đoán/khuyên đổi thuốc; Zalo adapter giả lập thành công, lỗi và retry; quyền gia đình chỉ đọc báo cáo nhà mình.

**Cài đặt:** nối AI core hiện có vào report thật; worker nền và outbox; template/thông báo Zalo; UI dòng thời gian báo cáo.

**Điều kiện hoàn tất:** một lượt hoàn tất tạo tối đa một báo cáo và một thông báo được theo dõi trạng thái; lỗi tích hợp có thể retry an toàn.

## Lát 4 — Cảnh báo

**Luồng:** rule engine chạy trên dữ liệu đã lưu → tạo/cập nhật cảnh báo → admin xác nhận xử lý → gia đình thấy trạng thái phù hợp.

**Test viết trước:** ranh giới luật bỏ thuốc hai lần liên tiếp; không tạo cảnh báo từ dữ liệu thiếu; policy huyết áp mặc định tắt; AI không quyết định độ nghiêm trọng/bước xử lý.

**Cài đặt:** kết nối rule engine hiện có với readings/logs; queue điều phối admin; trạng thái đã xem/đang xử lý/đã đóng; notification theo quy trình đã duyệt.

**Điều kiện hoàn tất:** cảnh báo có mã luật, dữ liệu nguồn, trạng thái xử lý và lịch sử; huyết áp chỉ bật sau policy đã được duyệt.

## Lát 5 — Thanh toán và gia hạn

**Luồng:** gia đình chọn gói → backend tạo phiên thanh toán → webhook xác minh chữ ký/idempotency → cập nhật subscription → UI hiện hạn và trạng thái gia hạn.

**Test viết trước:** chữ ký webhook, webhook gửi trùng/thứ tự sai, trạng thái thanh toán thất bại/hoàn tiền, RLS subscription theo family.

**Cài đặt:** tích hợp provider đã chọn, quản lý subscription ở server, trang gói/thanh toán và thông báo gia hạn.

**Điều kiện hoàn tất:** trạng thái chỉ đổi từ webhook hợp lệ; gửi lại webhook không nhân đôi giao dịch.

**Cổng quyết định trước lát 5:** chọn provider thanh toán và gói/giá từ spec hoặc được duyệt trước khi tích hợp.
