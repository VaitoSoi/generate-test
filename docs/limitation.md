# Generate Test limit

### Thông số kỹ thuật khi test:
+ CPU: AMD Ryzen 5 5600H
+ RAM: 8GB
+ OS: Windows 11 Home 23H2
+ Runtime: NodeJS v20.10.0
+ **Số lượng testcase: 100**

### Lưu ý:
+ Các giới hạn trên là giới hạn để chương trình không bị tràn RAM.
+ Các giới hạn được đo đạt trên một cấu hình cụ thể, chỉ mang tính chất tham khảo.
+ Các giới hạn có thể khác (lớn hơn, bé hơn) tùy vào cấu hình chạy code (cấu hình phần cứng, số lượng testcase, hệ điều hành, runtime, v.v...).
+ Format thời gian chạy: min:sec.ms

## Bảng giới hạn
| Kiểu dữ liệu         | Giới hạn        | Lưu ý |
| ------------         | --------        | ----- |
| Biến đơn             | Không giới hạn  | /     |
| Mảng một chiều (TH1) | Size: <= 10^6 <br> Content: ~10^9 | / |
| Mảng một chiều (TH2) | Size: ~10^7 <br> Content: 10^7 ~ 10^9 | Nếu xếp mảng thành hàng dọc thì sẽ xảy ra lỗi |
| Mảng hai chiều (TH1) | Size: 1000 * 1000 (~10^6) <br> Content: ~10^9 | / |

## Báo cáo thực tế
| Kiểu dữ liệu   | Kích thước | Thời gian chạy (m:ss.mmm) | RAM đã dùng (MB) |
| ------------   | ---------- | ------------------------- | ---------------- |
| Mảng một chiều | Size: 10^7 <br> Content: 10^7 | 8:34.484 | V8: 558.426/591.775 <br> C++: 42.241 <br> ArrayBuffers: 39.935 |
| Mảng một chiều | Size: 10^7 <br> Content: 10^9 | 8:40.281 | V8: 476.358/506.985 <br> C++: 52.501 <br> ArrayBuffers: 50.173 |
| Mảng hai chiều | Size: 1000 * 1000 (10^6) <br> Content: 10^9 | 36.646 | V8: 96.301/122.371 <br> C++: 4.902 <br> ArrayBuffers: 3.141 |