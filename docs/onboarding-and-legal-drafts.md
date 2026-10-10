# Onboarding Nhà Gần và dự thảo văn bản

**Trạng thái: Bản thiết kế và dự thảo. Chưa phải tài liệu pháp lý để ký hoặc công bố.**  
Ngôn ngữ dùng câu ngắn, từ thông dụng. Các chỗ `[CẦN ĐIỀN]` phải được hoàn thiện trước khi dùng. Mọi mục **[LUẬT SƯ RÀ SOÁT]** cần luật sư Việt Nam xác nhận.

## 1. Nguyên tắc chung

- Cha mẹ là người cần được giải thích và tôn trọng lựa chọn. Người tạo tài khoản không mặc nhiên có quyền đồng ý thay cha mẹ.
- Chỉ hỏi dữ liệu cần để điều phối lượt thăm.
- Tách lựa chọn theo từng mục đích. Không chọn sẵn ô đồng ý.
- Có thể xem lại nội dung trước khi xác nhận. Lưu phiên bản, thời điểm, người xác nhận và cách xác nhận.
- Nhà Gần điều phối người chăm. Nhà Gần không chẩn đoán, chữa bệnh, kê đơn, hoặc khuyên đổi thuốc.
- Ngưỡng huyết áp do sản phẩm đặt hiện vẫn tắt. Không cho người dùng tự đặt ngưỡng trong app cho tới khi có policy vận hành được chuyên gia duyệt. Khi có policy, chỉ cho chọn/ghi ngưỡng đã được nhân viên y tế của gia đình cung cấp; app chỉ so khớp và chuyển thông tin theo quy trình.

## 2. Luồng onboarding theo vai trò

### Con cái: tạo dịch vụ cho cha mẹ

1. **Giải thích trước khi bắt đầu.** “Nhà Gần sắp xếp người ghé thăm và gửi cập nhật. Đây không phải dịch vụ y tế.” Nêu thời gian dự kiến, phí và cách liên hệ người thật.
2. **Tạo hồ sơ cha/mẹ.** Họ tên gọi, xã, địa chỉ đủ để tìm nhà, cách vào nhà/lưu ý đi lại, khung giờ phù hợp. Không bắt nhập bệnh sử hay thuốc để hoàn tất hồ sơ dịch vụ.
3. **Người liên hệ khẩn cấp.** Tên, quan hệ, số điện thoại, thứ tự gọi và khung giờ có thể gọi. Xác nhận người đó biết sẽ được liên hệ. Nêu rõ ai được chia sẻ gì.
4. **Thông báo và cảnh báo.** Chọn kênh liên hệ và người nhận. Huyết áp: hiện hiển thị “Tính năng chưa mở — Nhà Gần chưa có ngưỡng được duyệt”. Không cho tự gõ ngưỡng hoặc phát cảnh báo tự động. Cảnh báo quy trình khác (ví dụ không xác nhận lượt thăm) phải được tách khỏi cảnh báo sức khỏe.
5. **Đồng ý theo từng mục đích.** Tách riêng: (a) dữ liệu cơ bản để điều phối; (b) dữ liệu sức khỏe nếu gia đình chủ động yêu cầu ghi nhận; (c) dùng Claude để soạn tóm tắt; (d) nhận báo mới qua Zalo; (e) người chăm được xem thông tin tối thiểu. Nêu ai xử lý, mục đích, bên nhận, thời gian lưu, cách rút lại và hệ quả của việc không đồng ý. Không gộp đồng ý tiếp thị vào điều kiện dịch vụ.
6. **Xác nhận quyền đại diện.** Hỏi người tạo có phải chính cha/mẹ hoặc đại diện hợp pháp không. Nếu không, hướng dẫn gửi lời mời để cha/mẹ tự đọc và xác nhận. Chuyển hồ sơ cho nhân viên hỗ trợ khi không thể xác định quyền đại diện.
7. **Xem lại và hoàn tất.** Hiện bản tóm tắt lựa chọn. Gửi bản lưu cho người xác nhận. Cho sửa, rút đồng ý, hoặc yêu cầu bản giấy qua hỗ trợ.

**[LUẬT SƯ RÀ SOÁT]** Cách xác định đại diện hợp pháp, năng lực đồng ý, bằng chứng đồng ý điện tử, xử lý khi cha/mẹ không thể tự xác nhận, và cơ sở tiếp tục lưu hồ sơ khi rút đồng ý.

### Người chăm: xác minh và học quy trình

1. **Giới thiệu công việc.** Nêu địa bàn, việc được làm, việc không được làm, cách trả công, cách từ chối ca và đầu mối hỗ trợ.
2. **Tạo hồ sơ.** Họ tên, số liên lạc, xã, lịch rảnh, người tham chiếu nếu có căn cứ và quy trình đã công bố.
3. **Nộp giấy tờ.** Hiện tên từng giấy tờ cần nộp, lý do, ai được xem, hạn lưu và ngày hết hạn. Chỉ thu trường dữ liệu cần xác minh. Che bớt số giấy tờ khi hiển thị cho điều phối viên không trực tiếp xác minh.
4. **Rà soát.** Trạng thái “Chưa nộp / Đang rà soát / Cần bổ sung / Đã xác minh / Hết hạn”. Không giao ca khi hồ sơ bắt buộc chưa đạt.
5. **Học 4 bài ngắn.** (a) Chào hỏi và tôn trọng lựa chọn; (b) check-in, ghi việc đã làm; (c) riêng tư, ảnh và dữ liệu; (d) ranh giới y tế và gọi đúng đầu mối khi có tình huống ngoài khả năng.
6. **Kiểm tra cuối bài.** 5 câu tình huống. Đạt ít nhất 4/5. Nếu chưa đạt, chỉ rõ bài cần học lại; cho làm lại. Không dùng bài kiểm tra thay cho đào tạo có yêu cầu pháp luật.
7. **Cam kết ranh giới và xác nhận.** Đọc từng ý, ký điện tử hoặc ký giấy. Lưu bản cam kết, phiên bản nội dung, thời điểm và tài khoản xác nhận.
8. **Mở trạng thái sẵn sàng nhận ca.** Chỉ sau khi hồ sơ đủ, bài học đạt và cam kết được ghi nhận.

**[LUẬT SƯ RÀ SOÁT]** Loại giấy tờ được phép thu, căn cứ kiểm tra lý lịch/tham chiếu, vai trò người chăm (nhân viên hay đối tác), hợp đồng lao động/dịch vụ, đào tạo bắt buộc, thời hạn giữ bản sao giấy tờ và xử lý khiếu nại.

### Cha mẹ: trang giới thiệu dễ đọc

Một trang, không bắt đăng nhập. Chữ tối thiểu 22 px, nút gọi cao ít nhất 56 px. Có thể nhờ con hoặc nhân viên đọc cùng.

> **Xin chào bác [TÊN].**  
> Cô/chú [TÊN NGƯỜI CHĂM] sẽ ghé nhà mình vào [NGÀY, GIỜ].  
> Nhà Gần sắp xếp để có người ở gần thăm hỏi và giúp những việc sinh hoạt đã thống nhất với gia đình.  
> Cô/chú không đến để khám bệnh. Cô/chú không đổi thuốc hay đưa lời khuyên điều trị.  
> Bác có thể từ chối một việc hoặc đề nghị dừng buổi thăm bất cứ lúc nào.  
> Muốn hỏi, đổi lịch hoặc báo không muốn tiếp khách? Gọi thẳng [SỐ ĐIỆN THOẠI NHÀ GẦN].

**[CẦN ĐIỀN]** Số thật có người trực, giờ nghe máy, tên người chăm, ảnh (chỉ khi có lựa chọn riêng), địa điểm và hướng dẫn liên hệ khi không nghe máy. Không dùng số giả trong bản phát hành.

## 3. Dự thảo Điều khoản sử dụng

### Điều 1. Nhà Gần làm gì

Nhà Gần kết nối gia đình với người chăm tại địa phương. Nhà Gần sắp xếp lịch, ghi nhận lượt thăm và chuyển cập nhật cho người được gia đình chọn.

Nhà Gần không phải cơ sở khám chữa bệnh. Nhà Gần không khám, chẩn đoán, kê đơn, chữa bệnh hoặc khuyên đổi thuốc.

### Điều 2. Việc người chăm có thể làm

Người chăm chỉ làm các việc sinh hoạt đã được gia đình và người được thăm thống nhất. Ví dụ: thăm hỏi, hỗ trợ việc nhà nhẹ và báo lại việc đã xảy ra.

Người chăm không tự ý cho thuốc, đổi liều, diễn giải chỉ số sức khỏe hoặc hứa kết quả sức khỏe.

### Điều 3. Lịch và thay đổi

Lịch thăm được xác nhận qua [KÊNH]. Gia đình có thể đề nghị đổi hoặc hủy theo quy định tại [CHÍNH SÁCH HỦY]. Nhà Gần sẽ báo khi chưa tìm được người thay thế.

### Điều 4. Cập nhật và tình huống cần hỗ trợ

Nhà Gần gửi cập nhật cho người được gia đình chỉ định. Cập nhật không phải hồ sơ y tế hoặc tư vấn chuyên môn.

Khi người chăm thấy tình huống vượt quá việc đã thống nhất, người chăm liên hệ đầu mối gia đình và Nhà Gần theo quy trình. Nếu có nguy cơ trước mắt, gọi số khẩn cấp phù hợp tại địa phương. Nhà Gần không thay thế dịch vụ cấp cứu.

### Điều 5. Phí và thanh toán

Gói, giá, kỳ thu, phí phát sinh, gia hạn và hoàn tiền phải được hiển thị trước khi đặt dịch vụ: [BẢNG GIÁ VÀ QUY TẮC THANH TOÁN]. Không coi ô đồng ý dữ liệu cho mục đích tùy chọn là điều kiện thanh toán.

### Điều 6. Quyền riêng tư

Nhà Gần chỉ xử lý dữ liệu theo Chính sách quyền riêng tư và lựa chọn đồng ý riêng. Gia đình có thể yêu cầu xem, sửa, hạn chế, rút đồng ý hoặc xóa dữ liệu theo quy trình được công bố.

### Điều 7. Tiếp nhận phản hồi và tranh chấp

Gia đình có thể liên hệ [ĐẦU MỐI, ĐỊA CHỈ, EMAIL, ĐIỆN THOẠI]. Hai bên trước hết trao đổi để làm rõ sự việc. Quyền khiếu nại, yêu cầu bồi thường hoặc quyền bắt buộc theo pháp luật không bị loại trừ bởi điều khoản này.

### Điều 8. Hiệu lực và thay đổi

Phiên bản này áp dụng từ [NGÀY]. Khi sửa nội dung ảnh hưởng đến quyền hoặc mục đích xử lý dữ liệu, Nhà Gần thông báo trước và xin xác nhận lại khi pháp luật yêu cầu.

**[LUẬT SƯ RÀ SOÁT]** Mô hình cung cấp dịch vụ; phân bổ trách nhiệm giữa nền tảng, gia đình và người chăm; giới hạn trách nhiệm (không được loại trừ quyền bắt buộc); khẩn cấp; phí/gia hạn/hoàn tiền; hợp đồng điện tử; cơ chế giải quyết tranh chấp; điều khoản theo mẫu và nghĩa vụ công bố/đăng ký nếu thuộc diện áp dụng.

## 4. Dự thảo Chính sách quyền riêng tư

### Ai chịu trách nhiệm

Đơn vị vận hành là [TÊN PHÁP NHÂN], địa chỉ [ĐỊA CHỈ]. Đầu mối quyền riêng tư: [EMAIL, ĐIỆN THOẠI]. Vai trò pháp lý của Nhà Gần và từng đối tác sẽ được nêu rõ sau khi rà soát.

### Dữ liệu có thể được dùng

- Thông tin tài khoản và liên lạc.
- Địa chỉ, lịch, yêu cầu thăm và người liên hệ khẩn cấp.
- Hồ sơ xác minh và giấy tờ của người chăm.
- Báo cáo lượt thăm. Có thể có chỉ số sức khỏe hoặc thông tin thuốc nếu gia đình chủ động yêu cầu ghi nhận.
- Lựa chọn đồng ý, lịch sử yêu cầu dữ liệu, hỗ trợ và nhật ký bảo mật.

### Dùng dữ liệu để làm gì

Tạo và quản lý hồ sơ; ghép lịch; xác minh người chăm; ghi nhận lượt thăm; gửi cập nhật; xử lý yêu cầu; thanh toán; bảo vệ tài khoản; đáp ứng nghĩa vụ pháp luật.

Chỉ dùng AI để soạn bản tóm tắt hỗ trợ. AI không chẩn đoán, không khuyên điều trị, không tự quyết cảnh báo. Nếu bật xử lý bằng Claude, Nhà Gần phải công bố dữ liệu nào được gửi, cho mục đích nào và cách xử lý ở nhà cung cấp trước khi xin lựa chọn riêng.

### Chia sẻ với ai

Chia sẻ tối thiểu với người chăm được phân công, thành viên gia đình được phép, nhà cung cấp lưu trữ/xử lý đã được duyệt, và cơ quan có thẩm quyền khi pháp luật yêu cầu.

Thông báo Zalo mặc định chỉ báo có cập nhật. Không đưa chỉ số sức khỏe, ghi chú thăm, tên cha mẹ hoặc nội dung thuốc vào tin nhắn.

### Lưu và bảo vệ

Nhà Gần đề xuất các mốc lưu sau khi rà soát: hồ sơ đang hoạt động đến khi kết thúc dịch vụ; chứng từ theo thời hạn luật định; giấy tờ xác minh đến hết nhu cầu xác minh cộng thời hạn khiếu nại; dữ liệu sức khỏe xóa hoặc ẩn danh khi hết mục đích. Mốc cụ thể: [BẢNG THỜI HẠN LƯU ĐÃ ĐƯỢC DUYỆT].

Nhà Gần giới hạn người truy cập, ghi nhật ký thao tác, mã hóa khi truyền và bảo vệ bản sao lưu. Nhà Gần không tuyên bố mã hóa hoặc vị trí lưu của nhà cung cấp cho đến khi xác minh cấu hình thực tế.

### Quyền và liên hệ

Chủ thể dữ liệu có thể gửi yêu cầu xem, sửa, hạn chế, rút lại đồng ý, phản đối hoặc xóa theo quyền áp dụng. Gửi yêu cầu đến [ĐẦU MỐI]. Nhà Gần xác minh người yêu cầu và phản hồi theo thời hạn pháp luật hiện hành. Một số dữ liệu có thể phải giữ theo luật hoặc để giải quyết giao dịch; Nhà Gần sẽ giải thích phần đó.

### Dữ liệu của cha mẹ và đại diện

Con cái có thể tạo hồ sơ liên hệ để bắt đầu điều phối. Việc đó không tự động thay thế sự đồng ý của cha mẹ đối với dữ liệu cá nhân của cha mẹ. Nhà Gần sẽ xin xác nhận trực tiếp hoặc kiểm tra căn cứ đại diện phù hợp.

### Cập nhật chính sách

Phiên bản: [SỐ]. Ngày hiệu lực: [NGÀY]. Khi mục đích xử lý thay đổi, Nhà Gần cập nhật thông báo và xin lại lựa chọn nếu cần.

**[LUẬT SƯ RÀ SOÁT]** Vai trò kiểm soát/xử lý; căn cứ xử lý từng trường dữ liệu; đồng ý của người cao tuổi/đại diện; hồ sơ đánh giá tác động; chuyển dữ liệu xuyên biên giới; nghĩa vụ khi rò rỉ; thời hạn lưu; quyền xóa; lưu chứng từ; nội dung nhà cung cấp và chuyển dữ liệu.

## 5. Mẫu đồng ý xử lý dữ liệu sức khỏe

### Thông tin trước khi chọn

Người có dữ liệu: [HỌ TÊN CHA/MẸ].  
Người xác nhận: [HỌ TÊN]. Vai trò: [CHỦ THỂ / NGƯỜI ĐẠI DIỆN — NÊU CĂN CỨ].  
Bên chịu trách nhiệm: [TÊN PHÁP NHÂN, ĐẦU MỐI].  
Loại dữ liệu: [chỉ đánh dấu thứ thật sự thu thập: chỉ số được gia đình yêu cầu, thông tin về thuốc do gia đình cung cấp, ghi chú cần thiết cho lượt thăm].

Nhà Gần dùng dữ liệu này để điều phối lượt thăm và gửi thông tin cho người được chỉ định. Nhà Gần không dùng dữ liệu để chẩn đoán, quyết định điều trị hoặc khuyên đổi thuốc.

### Lựa chọn riêng, không chọn sẵn

- [ ] Tôi đồng ý Nhà Gần ghi nhận các loại dữ liệu nêu trên để điều phối lượt thăm và gửi cập nhật cho [NGƯỜI NHẬN].
- [ ] Tôi đồng ý dùng Claude để hỗ trợ viết tóm tắt từ dữ liệu đã nêu. Tôi hiểu đầu ra có thể sai và được kiểm tra trước khi gửi. Nếu mục đích này không được chọn, bản tóm tắt sẽ do người điều phối viết.
- [ ] Tôi đồng ý gửi thông báo Zalo cho [TÀI KHOẢN/NGƯỜI NHẬN]. Nội dung mặc định không chứa dữ liệu sức khỏe. Đây là lựa chọn riêng.
- [ ] Tôi đồng ý chia sẻ phần dữ liệu tối thiểu cần thiết với người chăm được phân công: [TRƯỜNG CỤ THỂ].

Không đồng ý mục đích tùy chọn không làm mất quyền sử dụng phần dịch vụ không cần mục đích đó. Có thể rút lại hoặc yêu cầu hạn chế xử lý tại [KÊNH]. Nhà Gần giải thích dữ liệu nào không thể tiếp tục dùng và phần nào phải giữ theo pháp luật.

Thời hạn lưu: [MỐC ĐÃ ĐƯỢC LUẬT SƯ DUYỆT]. Nhà cung cấp xử lý và nơi xử lý: [DANH SÁCH ĐÃ XÁC MINH].

Tôi đã đọc hoặc được đọc giải thích. Tôi có thể hỏi trước khi chọn. Việc im lặng không được tính là đồng ý.

Chọn: [Đồng ý từng mục / Không đồng ý / Cần giải thích thêm]  
Người xác nhận: [TÊN] · Ngày giờ: [THỜI ĐIỂM] · Cách xác nhận: [ĐIỆN TỬ/GIẤY] · Phiên bản: [SỐ]

**[LUẬT SƯ RÀ SOÁT]** Chủ thể/đại diện và năng lực đồng ý; nhóm dữ liệu, mục đích và ngoại lệ; consent riêng cho AI, thông báo và người chăm; bằng chứng consent; yêu cầu rút lại/hạn chế; chuyển dữ liệu ra nước ngoài; quy định xử lý khẩn cấp. Không đưa form này vào production trước khi được chốt.

## 6. Dự thảo Hợp đồng dịch vụ điều phối

**Bên cung cấp:** [TÊN PHÁP NHÂN, MÃ SỐ, ĐỊA CHỈ].  
**Bên sử dụng dịch vụ:** [TÊN, THÔNG TIN LIÊN HỆ].  
**Người được thăm:** [TÊN, ĐỊA CHỈ], đã được giải thích về lượt thăm và cách từ chối.

### Phạm vi

Nhà Gần điều phối người chăm, lịch thăm, ghi nhận việc đã làm và cập nhật cho người được chỉ định. Gói dịch vụ, số lượt và thời gian: [PHỤ LỤC GÓI]. Giá và thuế/phí: [BẢNG GIÁ].

### Ranh giới y tế

Người chăm không khám bệnh, đoán bệnh, kê thuốc, cho uống thuốc thay người dùng, thay đổi liều, tư vấn điều trị hoặc hứa kết quả sức khỏe. Người chăm chỉ ghi lại thông tin khách quan trong phạm vi đã thống nhất.

Chỉ số sức khỏe, nếu có, là dữ liệu do người chăm ghi nhận. Chỉ số không phải kết luận chuyên môn. Nhà Gần không dùng AI để tự quyết mức độ nguy hiểm. Mọi cảnh báo chỉ theo quy trình viết sẵn đã được duyệt.

### An toàn và liên hệ

Gia đình cung cấp đầu mối có thể liên hệ và thứ tự gọi. Người chăm liên hệ đầu mối khi có việc ngoài phạm vi buổi thăm. Khi cần hỗ trợ khẩn cấp, làm theo số và quy trình địa phương đã được duyệt: [QUY TRÌNH]. Nhà Gần không cam kết thay thế lực lượng cấp cứu hoặc người thân.

### Quyền của người được thăm

Người được thăm có quyền hỏi danh tính người chăm, từ chối một việc, yêu cầu dừng buổi thăm và gọi Nhà Gần. Nếu người được thăm từ chối, người chăm không được ép buộc. Người chăm báo lại việc từ chối cho đầu mối đã chọn.

### Lịch, hủy và thay người

Lịch được xác nhận qua [KÊNH]. Đổi/hủy trước [THỜI HẠN]. Phí đổi/hủy: [QUY TẮC]. Nếu người chăm vắng mặt, Nhà Gần báo gia đình và nêu phương án. Không khẳng định lượt thăm đã diễn ra khi chưa có bằng chứng check-in/check-out hợp lệ.

### Dữ liệu và bảo mật

Các bên chỉ dùng dữ liệu theo Chính sách quyền riêng tư và mẫu đồng ý. Người chăm không chụp ảnh, ghi âm, chia sẻ thông tin hoặc dùng dữ liệu vào việc riêng nếu chưa có căn cứ và lựa chọn phù hợp.

### Phí, gia hạn, chấm dứt và khiếu nại

Kỳ dịch vụ: [NGÀY BẮT ĐẦU–KẾT THÚC]. Gia hạn: [CƠ CHẾ]. Chấm dứt và hoàn tiền: [QUY TẮC RÕ RÀNG]. Hóa đơn/chứng từ được gửi qua [KÊNH]. Khiếu nại gửi đến [ĐẦU MỐI].

### Xác nhận

Hai bên được xem hợp đồng trước khi ký và nhận một bản có thể lưu. Ngày ký: [NGÀY]. Bên sử dụng: [KÝ]. Nhà Gần: [KÝ]. Người được thăm xác nhận đã được giải thích và có thể liên hệ trực tiếp: [CÁCH GHI NHẬN].

**[LUẬT SƯ RÀ SOÁT]** Chủ thể giao kết và người được thăm; đại diện/ủy quyền; phân loại quan hệ với người chăm; trách nhiệm và bảo hiểm; điều khoản miễn/giới hạn trách nhiệm; an toàn tại nhà; quy trình khẩn cấp; phí, gia hạn, hủy và hoàn tiền; hợp đồng điện tử; bảo vệ người tiêu dùng; giải quyết tranh chấp.

## 7. Việc cần chốt trước khi phát hành

1. Tên pháp nhân, địa chỉ, đầu mối khiếu nại và đầu mối quyền riêng tư.
2. Danh sách dữ liệu thực sự thu thập, người xem, thời hạn lưu và quy trình xóa.
3. Bên xử lý, nơi lưu/xử lý và hợp đồng với Supabase, Vercel, Anthropic, Upstash, Zalo.
4. Cách cha/mẹ tự xác nhận hoặc chứng minh người đại diện.
5. Kênh, người trực, thời gian phản hồi và quy trình khẩn cấp thật.
6. Giá, gói, gia hạn, đổi/hủy, hoàn tiền và hóa đơn.
7. Giấy tờ cần cho xác minh người chăm; lịch đào tạo; xử lý khi hết hạn.
8. Ngưỡng cảnh báo sức khỏe: hiện tắt. Chỉ mở sau khi chuyên gia và luật sư rà soát quy trình.
9. Rà soát pháp lý toàn văn theo Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và Nghị định 356/2025/NĐ-CP đang có hiệu lực từ 01/01/2026. Khoản 2 Điều 42 Nghị định 356 quy định Nghị định 13/2023/NĐ-CP hết hiệu lực từ ngày đó. Luật sư cần rà soát quy định chuyển tiếp cho hồ sơ/hoạt động bắt đầu trước ngày 01/01/2026.

## 8. Ghi chú pháp lý

Tài liệu này là bản thiết kế nội dung, không phải tư vấn pháp luật. Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và Nghị định 356/2025/NĐ-CP có hiệu lực từ 01/01/2026. Khoản 2 Điều 42 Nghị định 356 nêu Nghị định 13/2023/NĐ-CP hết hiệu lực từ cùng ngày. Luật yêu cầu sự đồng ý tự nguyện, rõ dữ liệu và mục đích, bên xử lý, quyền/nghĩa vụ; lựa chọn cụ thể theo từng mục đích; im lặng không phải đồng ý. Luật sư cần rà soát điều khoản chuyển tiếp và tình huống thực tế của Nhà Gần trước khi dùng.

Nguồn tham khảo chính thức:

- [Luật số 91/2025/QH15 — Cổng văn bản Chính phủ](https://vanban.chinhphu.vn/?docid=214590&pageid=27160)
- [Nghị định số 356/2025/NĐ-CP — Cổng văn bản Chính phủ](https://vanban.chinhphu.vn/?classid=1&docid=216387&pageid=27160&typegroupid=4)
- [Nghị định số 13/2023/NĐ-CP — Cổng văn bản Chính phủ](https://vanban.chinhphu.vn/default.aspx?docid=207759&pageid=27160)
- [Luật số 19/2023/QH15 — Luật Bảo vệ quyền lợi người tiêu dùng](https://vanban.chinhphu.vn/?classid=1&docid=208363&orggroupid=1&pageid=27160)
