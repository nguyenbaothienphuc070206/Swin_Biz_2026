# Thiết kế tích hợp MoMo Subscription và Zalo OA

**Trạng thái:** MoMo đã được người dùng chọn; đây là đề xuất schema trước migration. Chưa có Supabase client, cơ sở dữ liệu thật, tài khoản merchant/OA hoặc credentials trong repo.  
**Lựa chọn thanh toán đã thống nhất:** một người đại diện ủy quyền thuê bao định kỳ; người nhà khác có thể góp bằng các khoản riêng.  
**Kênh Zalo đề xuất:** ZBS Template Message giao dịch qua UID, không gửi chỉ số sức khỏe trong nội dung; gửi lời báo có cập nhật và đường dẫn đăng nhập. Template và quyền gửi phải được Zalo duyệt/cấp trước khi bật.

## Tài liệu chính thức đã đối chiếu

- MoMo Subscription API: tạo ủy quyền, chu kỳ/giới hạn tiền, charge định kỳ, token, hủy và IPN được mô tả tại [Subscription](https://developers.momo.vn/v3/docs/payment/api/wallet/subscription/).
- MoMo yêu cầu `requestId` duy nhất cho idempotency; dùng cùng `requestId` khi retry, tối thiểu MoMo giữ khóa 31 ngày: [API Idempotency](https://developers.momo.vn/v3/docs/payment/api/result-handling/idempotency/).
- Merchant phải đăng ký, đi qua môi trường test, chia sẻ kết quả SIT, xác minh tài khoản, xin credential production, làm UAT; automated payment cần Tokenization Evaluation Form. Tài liệu không nêu SLA số ngày: [Integration Procedures](https://developers.momo.vn/v3/docs/payment/onboarding/integration-process/).
- Tài liệu OA ghi tin Tư vấn OpenAPI chỉ được gửi trong 7 ngày từ tương tác gần nhất; tin ngoài 48 giờ có phí/quota. Để gửi báo cáo/alert theo sự kiện bất kỳ, ZBS Template Message là hướng phù hợp hơn; template cần đăng ký và kiểm duyệt: [Tin Tư vấn](https://oa.zalo.me/home/documents/vie/guides/tin-tu-van), [ZBS Template Message](https://oa.zalo.me/home/documents/vie/guides/zbs-template-message).
- OA OpenAPI hiện cần gói Tăng trưởng hoặc Toàn diện; mức niêm yết lần tra cứu là 2,5 triệu/năm hoặc 1,4 triệu/6 tháng cho Tăng trưởng, 6 triệu/năm hoặc 3,4 triệu/6 tháng cho Toàn diện; hạn mức API 100 hoặc 2.000 request/phút. Gói có 500 hoặc 2.000 tin Tư vấn ngoài 48 giờ/tháng. ZBS Template Message tính riêng theo mẫu, bảng giá hiển thị các loại 200–300 đồng/tin thành công, chưa VAT; cách gửi qua UID và thành phần mẫu có thể ảnh hưởng giá: [Bảng giá OA](https://zalo.solutions/oa/pricing), [Bảng giá ZBS Template Message](https://zalo.solutions/business-message/pricing).
- Zalo mô tả chữ ký webhook `X-ZEvent-Signature` là SHA-256 của `appId + data + timeStamp + OAsecretKey`: [sự kiện OA gửi tin](https://stc-developers.zdn.vn/docs/v2/official-account/webhook/tin-nhan/su-kien-official-account-gui-tin-nhan-cho-nguoi-dung?lang=vi).

Không tìm thấy phí merchant subscription hoặc số ngày duyệt công khai trong tài liệu MoMo đã tra cứu; cần báo giá/ETA trực tiếp. Tài liệu kỹ thuật gửi ZBS Template Message và OA token management trên `developers.zalo.me` tải dạng ứng dụng không hiển thị nội dung qua công cụ tra cứu trong phiên này. Vì yêu cầu không đoán API, chưa viết sender/refresh-token client hoặc route nhận webhook Zalo cho tới khi nội dung endpoint, quyền, token rotation và cách xác thực được xác minh từ tài liệu chính thức truy cập được.

## Luồng dự kiến

### MoMo

1. Gia đình chọn một trong các gói; server đọc giá có hiệu lực từ bảng `billing_plans`, không nhận amount từ client.
2. Server tạo invoice theo gia đình/kỳ hạn, contribution cho người trả chính, `orderId`/`requestId` ngẫu nhiên không chứa tên, số điện thoại hay ID người dùng; tạo yêu cầu Subscription có chữ ký HMAC-SHA256.
3. Người trả chính sang MoMo để chủ động xác nhận ủy quyền. Chỉ sau IPN hợp lệ mới tạo/đánh dấu payment, lấy token bằng callback flow; token MoMo được mã hóa ứng dụng trước khi lưu, khóa mã hóa lấy từ env, không đưa xuống client/log.
4. Các thành viên khác trong gia đình tạo khoản góp one-time riêng vào invoice hiện hành. Tổng số góp và trạng thái invoice được tính trong transaction; không tin amount hoặc family ID do client tự khai.
5. Tác vụ nền thu phần còn thiếu từ người trả chính trong giới hạn đã được họ ủy quyền và được MoMo cho phép. **Trước khi triển khai charge theo phần dư, phải xác nhận với MoMo bằng sandbox/UAT rằng loại `VARIABLE` Subscription cho phép cách này và cách tính ngày charge.** Nếu không được hỗ trợ, thu full recurring amount từ người chính và không nhận thêm khoản góp vào invoice đã thanh toán.
6. IPN được kiểm chữ ký constant-time, xác minh merchant/order/amount/currency và trạng thái; `provider_events(provider, external_event_key)` unique, cập nhật event, contribution, invoice, subscription trong một DB transaction. Redirect từ trình duyệt không phải bằng chứng đã thu tiền.
7. Lỗi charge: đánh dấu kỳ `past_due`, giữ nguyên `paid_through`; không cấp thêm kỳ dịch vụ. MoMo có thể khóa ủy quyền sau hai lần thất bại do thiếu số dư; cần hiển thị “cần xác nhận lại thanh toán”, không lặp charge vô hạn.
8. Đối soát chạy định kỳ bằng API truy vấn trạng thái giao dịch, so khớp order/transaction/amount với ledger và đưa lệch vào hàng chờ admin; không tự sửa chênh lệch tài chính mù quáng.
9. Hủy giữa kỳ: tắt gia hạn ngay, gửi yêu cầu hủy authorization MoMo; dịch vụ còn đến `current_period_end`, sau thời điểm đó chuyển `expired`. Nếu revoke MoMo tạm lỗi, không tạo lần thu mới và retry revoke.

### Zalo

Sau report/alert đã commit thành công vào database, tạo một outbox item duy nhất cho mỗi recipient/event. Worker gửi template đã được duyệt; retry exponential backoff có giới hạn, trạng thái `queued/sending/sent/retry/dead`. Nội dung mặc định: “Nhà Gần có cập nhật mới cho gia đình. Đăng nhập để xem.” Không đặt huyết áp, thuốc, ghi chú, tên người cao tuổi trong tin nhắn/metadata Zalo. Chỉ bật sau opt-in của đúng chủ thể/người đại diện và đồng ý nhận thông báo.

Outbox bảo đảm chống tạo job trùng phía Nhà Gần. Bảo đảm không gửi trùng qua ranh giới mạng chỉ có thể tuyên bố sau khi xác minh Zalo có idempotency key hoặc API trạng thái gửi tương ứng; hiện tài liệu gửi API không đọc được trong phiên nên chưa kết luận.

## Schema đề xuất để duyệt

Các tên role trong chính sách RLS phải được nối với schema thành viên gia đình thật (`docs/spec.md` chưa có trong repo). Không tạo migration trước khi duyệt và chốt bảng membership.

| Bảng | Trường chính và ràng buộc |
|---|---|
| `billing_plans` | `id`, `code` (`basic`, `standard`, `comprehensive`), `amount_vnd`, `period_months`, `active`, `effective_from/to`, version. Amount nguyên VND; client chỉ gửi `plan_id`. |
| `family_subscriptions` | `id`, `family_id`, `plan_id`, `primary_payer_user_id`, `status`, `current_period_start/end`, `cancel_at_period_end`, `renewal_enabled`, `provider_order_id`, `provider_client_ref`, `provider_token_ciphertext`, `token_key_version`, timestamps. `family_id` có tối đa một subscription đang hoạt động. Token chỉ service role/RPC đọc. |
| `family_invoices` | `id`, `family_id`, `subscription_id`, `plan_version`, `period_start/end`, `amount_due_vnd`, `amount_paid_vnd`, `status` (`open/partially_paid/paid/past_due/void`), `due_at`, unique `(subscription_id, period_start)`. Snapshot giá để đổi giá không viết lại invoice cũ. |
| `invoice_contributions` | `id`, `invoice_id`, `payer_user_id`, `amount_vnd`, `provider`, `provider_order_id` unique, `provider_transaction_id` unique nullable, `status`, `kind` (`primary_recurring/family_one_time`), timestamps. Chỉ cộng khoản đã xác thực thành công. |
| `provider_events` | `provider`, `external_event_key`, `order_id`, `payload_hash`, `received_at`, `processed_at`, `result_code`; unique `(provider, external_event_key)`. Không lưu raw callback hoặc dữ liệu sức khỏe. |
| `notification_outbox` | `id`, `family_id`, `recipient_user_id`, `event_type`, `template_code`, `safe_variables`, `idempotency_key` unique, `status`, `attempts`, `next_attempt_at`, `provider_message_id`, `last_error_code`; không lưu report body/vitals. |
| `reconciliation_runs` / `reconciliation_items` | thời gian chạy, order/transaction refs, amount đã che hoặc mã hóa phù hợp, trạng thái khớp/lệch và admin xử lý. Không lưu raw provider payload. |

### Quyền/RLS

- Thành viên gia đình đang hoạt động chỉ đọc subscription, invoice và các khoản góp của gia đình mình. Mỗi người đọc được payer/amount/status, không đọc token/credential hoặc log raw.
- Thành viên tạo khoản góp chỉ cho chính `auth.uid()` và invoice thuộc gia đình họ; amount dương, dưới số dư invoice còn lại theo RPC nguyên tử. Không cho client đánh dấu paid.
- Người trả chính được thay gói/hủy theo quyền owner đã thống nhất; thay đổi giá/gói qua server và version hóa.
- Người chăm không đọc thanh toán; admin có quyền hỗ trợ tối thiểu và audit. Webhook dùng route server + RPC hẹp/role server; không mở quyền ghi ledger cho anon/authenticated.
- `notification_outbox` chỉ backend quản lý; người nhận chỉ xem lịch sử thông báo của chính mình.

## Endpoint dự kiến

- `POST /api/billing/subscriptions` — yêu cầu phiên hợp lệ + owner; tạo order từ plan server-side.
- `POST /api/billing/subscriptions/cancel` — tắt gia hạn, giữ quyền đến hết kỳ.
- `POST /api/billing/invoices/:id/contributions` — tạo khoản one-time MoMo cho invoice gia đình.
- `GET /api/families/:id/billing` — dữ liệu subscription/invoice theo membership RLS.
- `POST /api/webhooks/momo/subscription` — IPN/action callback đã kiểm chữ ký, idempotent.
- `POST /api/cron/billing/reconcile` và `/api/cron/billing/renew` — secret cron server-side, khóa job và idempotency.
- `POST /api/webhooks/zalo/oa` — chỉ sau khi chốt cách canonicalize chữ ký từ tài liệu OA; không dùng cho chứng từ thanh toán.
- Worker `notification_outbox` — gửi report/alert template đã duyệt, backoff và dead-letter.

## Cổng cần duyệt trước migration/production

1. Duyệt schema/bảng ở trên và xác nhận tên/role membership của `families`.
2. Chốt giá VND và kỳ thu của ba gói; chưa đưa con số giả vào seed.
3. MoMo xác nhận thử nghiệm subscription `VARIABLE` thu phần dư của invoice, chu kỳ charge, ngưỡng/điều kiện failed payment và quyền truy vấn đối soát.
4. Xác minh chính thức endpoint gửi ZBS Template theo UID, OAuth/refresh-token rotation, chữ ký webhook Zalo, retry/rate limit và khả năng chống trùng. Nếu không có idempotency ở provider, quy trình nhận timeout phải được duyệt.
5. Xác minh pháp lý về consent, lưu token thanh toán, hóa đơn điện tử và việc gửi thông báo có liên quan dữ liệu sức khỏe. Tin Zalo mặc định chỉ là thông báo có cập nhật, không chứa dữ liệu sức khỏe.

## Những gì đã code trong lát hiện tại

`lib/billing/lifecycle.ts` chứa phần lõi độc lập với DB: xử lý payment callback đã xác thực qua transaction interface, bỏ sự kiện trùng, đánh dấu failed/past-due mà không kéo dài thời gian đã trả, hủy gia hạn nhưng không rút quyền trước cuối kỳ, và xác thực chữ ký HMAC của IPN MoMo theo canonical fields trong tài liệu chính thức. Migration, API routes, Supabase adapter, MoMo HTTP client, token encryption, Zalo sender/worker và UI chưa có. Phần lõi không tự chứng minh callback đã xác thực; caller phải gọi verifier trước.
