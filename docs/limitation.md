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
| Kiểu dữ liệu         | Giới hạn    | Lưu ý |
| ------------         | --------    | ----- |
| Biến đơn             | <= 2^53 - 1 | /     |
| Mảng một chiều (TH1) | Size: <= 10^6 <br> Content: ~10^10 | / |
| Mảng một chiều (TH2) | Size: ~10^7 <br> Content: 10^7 ~ 10^9 | Nếu xếp mảng thành hàng dọc thì sẽ xảy ra lỗi |
| Mảng hai chiều       | Size: 1000 * 10000 (~10^7) <br> Content: ~10^9 | / |

## Báo cáo thực tế
| Kiểu dữ liệu   | Kích thước | Thời gian chạy (m:ss.mmm) | Trung bình RAM đã dùng (MB) |
| ------------   | ---------- | ------------------------- | ---------------- |
| Biến dơn       | 10^14 | 0.127993  | Tổng: 41.237 <br> V8: 10.260 <br> C++: 1.077 <br> ArrayBuffers: 0.160 |
| Biến dơn       | 2 * 10^14 | 0.150875  | Tổng: 42.360 <br> V8: 11.524 <br> C++: 1.087 <br> ArrayBuffers: 0.169 |
| Mảng một chiều | Size: 10^6 <br> Content: 10^9 | 49.500 | Tổng: 172.087 <br> V8: 104.679 <br> C++: 5.702 <br> ArrayBuffers: 4.786 |
| Mảng một chiều | Size: 10^6 <br> Content: 10^10 | 55.779 | Tổng: 169.015 <br> V8: 100.453 <br> C++: 5.919 <br> ArrayBuffers: 5.004  |
| Mảng một chiều | Size: 10^7 <br> Content: 10^9 | 8:35.887 | Tổng: 667.689 <br> V8: 544.090 <br> C++: 50.584 <br> ArrayBuffers: 49.265 |
| Mảng hai chiều | Size: 1000 * 1000 (10^6) <br> Content: 10^9 | 32.598 | Tổng: 160.656 <br> V8: 96.696 <br> C++: 4.028 <br> ArrayBuffers: 3.113 |
| Mảng hai chiều | Size: 1000 * 10000 (10^7) <br> Content: 10^9 | 4:39.375 | Tổng: 579.626 <br> V8: 485.221 <br> C++: 27.146 <br> ArrayBuffers: 26.231 |