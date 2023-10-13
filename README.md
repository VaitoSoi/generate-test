# Test generator for [GG9](https://facebook.com/cangtin2326/posts/122124768950028641)

## Mục lục

1. [Lưu ý]()

2. [Cách chạy code]()

    a. [Tải code]()

    b. [Tải bộ chạy]()

3. [Cách config code]()

    a. [Cách code hoạt động]()

    b. [Header (Define)]()

    c. [Body (Gentest)]()

4. [Giới hạn của code]()

### 1. Lưu ý 

+ Code hiện đang dùng cho mục đích sinh testcase cho [dự án GG9](facebook.com/cangtin2326/posts/122124768950028641) của page [Căng Tin 2326](https://www.facebook.com/cangtin2326).

+ Khi bạn muốn dùng code, vui lòng thông báo với chủ code (VaitoSoi) thông qua [GitHub Issue](https://github.com/VaitoSoi/generate-test/issues) hoặc nhắn tin trực tiếp bằng [Facebook Message](https://www.facebook.com/soi.tran.794628/), [Discord](https://discord.com).

+ Code không tối ưu cho mọi trường hợp sử dụng, vui lòng xem thêm ở [# Giới hạn của code]().

<!-- + **Quan trọng:** Đây chỉ là khung sườn của code (chỉ bao gồm các hàm), chưa phải code hoàn chỉnh nên chưa dùng được, xem thêm ở [# Các config code](). -->

### 2. Cách chạy code

#### a. Tải code

+ Tải trực tiếp từ Git Repo này

+ Dùng lệnh `git clone` (yêu cầu: trên máy phải có [git](https://git-scm.com/))

    ```bash
    git clone https://github.com/VaitoSoi/generate-test.git
    ```

#### b. Tải bộ chạy

Bạn có thể tham khảo bộ chạy sau:


|    |[NodeJs](https://nodejs.org/en)|[Bun](https://bun.sh/)|
|----|------|----|
|Ưu điểm| + Cộng đồng lớn | + Nhanh, quản lý bộ nhớ tốt hơn |
||+ Lịch sử lâu đời | + Ít lỗi vặt|
|Nhược điểm| + Kém ổn định| + Cộng đồng nhỏ|
|| + Tốc độ chậm| + Chưa hỗ trợ đầy đủ tính năng|

**Ý kiến cá nhân của dev:** Các bạn nên dùng [Bun](https://bun.sh/) vì ưu điểm quản lý bộ nhớ tốt, nhanh, giảm thời gian chạy khi sinh test lớn.

### 3. Config code

#### a. Cách code hoạt động

Vd đầu vào:
```
n number 0 1000
str string 100 0123
bool boolean
-----
n
const str
ghost bool
```

Đầu vào của code được chia làm hai phần ngang cách bởi dòng `-----`, bao gồm:

#### b. Phần header (trên dòng `-----`):

**Vd:**
```
n    number        0 10000
^    ^~~~~~        ^~~~~~~
Tên  Kiểu dữ liệu  Sau kiểu dữ liệu
```
**Giải thích:**

+ `Tên`: là tên của định nghĩa (define) này.

+ `Kiểu dữ liệu`: kiểu dữ liệu của define, gồm `number`, `string`, `boolean`.

+ `Sau kiểu dữ liệu`: dùng để xác định giới hạn của define (xác định min, max hoặc độ dài, chế độ cho việc tạo biến.)

**Lưu ý:** Sau kiểu dữ liệu sẽ khác so với từng kiểu dữ liệu, cụ thể:

+ `number`: gồm 2 số lần lượt là min và max

+ `string`: gồm 2 số lần lượt là độ dài của chuỗi và chế độ (`mode`) tạo chuỗi, `mode` sẽ là tập hợp từ 1 - 4 số đại diện cho:

    + `0`: Gồm chữ cái in thường (`abcdefghijklmnopqrstuvwxyz`)
    
    + `1`: Gồm chữ cái in hoa (`ABCDEFGHIJKLMNOPQRSTUVWXYZ`)

    + `2`: Gồm số (`0123456789`)

    + `3`: Gồm ký tự đặc biệt (`!@#$%^&*`)

    **Vd**: 

    + Để tạo 1 chuỗi gồm chữ in thường, chữ in hoa và số thì chế độ sẽ là `012`
            
    + Để tạo 1 chuỗi chỉ gồm chữ in thường thì chế độ sẽ là `0`

    + Để tạo 1 chuỗi chỉ gồm chữ in hoa và ký tự đặc biệt thì chế độ sẽ là `13`

+ `boolean`: không có

#### c. Phần body (dưới dòng `-----`):

**Vd:**
```
n            < Tạo một số 
[n; 10]      < Tạo mảng 1 chiều
[n; 10 - 3]  < Tạo mảng 2 chiều
```
+ Phần gentest sẽ chia làm 3 loại:

    + Tạo số:

        Nếu bạn chỉ muốn trên trên dòng này thì bạn nhập tên của define mà bạn đã thiết lập ở phần Header.

        **Vd**:

        + Bạn muốn tạo một số tự nhiên có giá trị từ 1 đến 1000:

            + Ở phần header bạn tạo 1 định nghĩa là `n number 1 1000` (xem phần giải thích ở [# Phần header]())

            + Sau đó ở phần body này bạn thêm dòng `n`, tống quan file sẽ như thế này:

                ```
                n number 1 1000
                -----
                n
                ```

            **Lưu ý:** Vị trí của biến trong phần gentest sẽ tương ứng với vị trí của nó trong testcase
            
            + Ở trường này, số `n` sẽ này ở dòng thứ nhất trong test.
        
        **Lưu ý:** Phía trước tên của define, bạn có thể thêm các tiền tố, cụ thể:

        + `const`: Sau khi tạo ra giá trị tương ứng thì code sẽ lưu giá trị này vào bộ nhớ đệm để dùng cho các mục đích khác.

            **Lưu ý:** 
            
            + Nếu bạn cho thêm một dòng với tên biến tương tự và có tiền tố `const` phía trước thì giá trị của lần này sẽ ghi đè lên giá trị của lần trước.

            + Để dùng biến đã lưu giá trị, ta chỉ cần ghi tên của define.

            + Hiện tại, giá trị của biến chỉ dùng được trong việc tạo mảng 1 chiều và 2 chiều (xác định số hàng và số cột)

            **Vd:** `const n`: Tạo một giá trị và lưu giá trị đó với tên là `n`

        + `ghost`: Khởi tạo 1 giá trị ma, sẽ không in ghi ra ngoài test.

            **Vd:** `ghost n`: Tuy biến `n` vẫn được tạo nhưng sẽ không in ra ngoài file test.

        + Bạn có thể cho trước 1 tên define 2 tiền tố cùng một lúc:

            **Vd:** `const ghost n`: Tạo một giá trị và lưu giá trị đó với tên là `n`, nhưng không in ra ngoài file test.
        
        Nếu bạn muốn tạo nhiều số trên một hàng thì bạn chỉ cần chèn giữa các tên define  dấu "`; `" (lưu ý: sau dấu `;` phải có dấu cách)

        + **Vd:** `a; b; c; ...`

    + Tạo mảng 1 chiều:

        Để tạo mảng 1 chiều, ta dùng cú pháp sau:

        ```
        [Tên; Số_Hàng]
        ```

        **Trong đó:**

        + `Tên`: là tên của define đã tạo trong phần Header, xác định giá trị của các số sẽ tạo bên trong mảng theo define ở phần Header

        + `Số_Hàng`: là số lượng hàng muốn tạo, có thể dùng biến đã được lưu từ trước.

        **Vd:**

        Để tạo một mảng với các giá trị bên trong ứng với define là `n` ở phần Header gồm 15 hàng, ta viết như sau:

        ```
        [n; 15]
        ```
