# Test generator for [GG9](https://facebook.com/cangtin2326/posts/122124768950028641)

### Mục lục

0. [Mục lục](#mục-lục)

1. [Lưu ý](#1-lưu-ý)

2. [Tải code và bộ chạy](#2-tải-code-và-bộ-chạy)

    a. [Tải code](#a-tải-code)

    b. [Tải bộ chạy](#b-tải-bộ-chạy)

    c. [Tải compiler]()

3. [Cách config code](#3-config-code)

    a. [Cách code hoạt động](#a-cách-code-hoạt-động)

    b. [Header (Define)](#b-phần-header-trên-dòng)

    c. [Body (Gentest)](#c-phần-body-dưới-dòng)

    d. [Cú pháp đặc biệt](#d-cú-pháp-đặc-biệt)

    e. [File config](#e-file-config)

4. [Chạy code](#4-chạy-code)

    a. [Lưu ý](#a-lưu-ý)

    b. [Tạo file config](#b-tạo-file-config)

    c. [Chạy code](#c-chạy-code)

<!-- 5. [Giới hạn của code]() -->

### 1. Lưu ý 

+ Code hiện đang dùng cho mục đích sinh testcase cho [dự án GG9](facebook.com/cangtin2326/posts/122124768950028641) của page [Căng Tin 2326](https://www.facebook.com/cangtin2326).

+ Khi bạn muốn dùng code, vui lòng thông báo với chủ code (VaitoSoi) thông qua [GitHub Issue](https://github.com/VaitoSoi/generate-test/issues) hoặc nhắn tin trực tiếp bằng [Facebook Message](https://www.facebook.com/soi.tran.794628/), [Discord](https://discord.com).

+ Code không tối ưu cho mọi trường hợp sử dụng.

+ Code sử dụng compiler G++ để compile file C++.

<!-- + **Quan trọng:** Đây chỉ là khung sườn của code (chỉ bao gồm các hàm), chưa phải code hoàn chỉnh nên chưa dùng được, xem thêm ở [# Các config code](). -->

### 2. Tải code và bộ chạy

#### a. Tải code

+ Tải trực tiếp từ [Github Repository](https://github.com/VaitoSoi/generate-test) này

+ Dùng lệnh [`git clone`](https://github.com/git-guides/git-clone) (yêu cầu: trên máy phải có [git](https://git-scm.com/))

    ```
    git clone https://github.com/VaitoSoi/generate-test.git
    ```

#### b. Tải bộ chạy

Bạn có thể tham khảo bộ chạy (runtime environment) sau:

| Runtime | Ưu điểm | Nhược điểm |
|---|---|---|
| [**Bun**](https://bun.sh/) | + Tốc độ nhanh nhất | - Cộng đồng còn nhỏ |
|| + Sử dụng JavaScriptCore | - Một số tính năng chưa được hỗ trợ đầy đủ |
|| + Hỗ trợ các tính năng hiện đại |
|| + Mới ra mắt nên còn khá ít lỗi |
| [**NodeJS**](https://nodejs.org/en) | + Cộng đồng lớn và tích cực | + Tốc độ chậm hơn Bun và Deno |
|| + Hỗ trợ nhiều thư viện và công cụ | + An toàn chưa được tối ưu |
|| + Tương thích ngược với NodeJS 12.x | + Tính ổn định chưa cao |
| [**Deno**](https://deno.com/) | * An toàn và bảo mật cao | * Tốc độ chậm hơn Bun |
|| * Được xây dựng trên nền tảng V8 mới nhất của Google | * Cộng đồng còn nhỏ |
|| * Hỗ trợ các tính năng hiện đại | * Một số tính năng chưa được hỗ trợ đầy đủ |


**Ý kiến cá nhân của dev:** Các bạn nên dùng [Bun](https://bun.sh/) vì ưu điểm quản lý bộ nhớ tốt, nhanh, giảm thời gian chạy khi sinh test lớn.

#### c. Tải complier

Tải compiler G++ cho window: https://sourceforge.net/projects/mingw/

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

+ `Kiểu dữ liệu`: kiểu dữ liệu của define, gồm `number`, `string`, `boolean` và `char`.

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

+ `boolean`: không có.

+ `char`: gồm một chuỗi chứa các ký tự muốn tạo.

    **Ví dụ**: Chọn 1 ký tự ngẫu nhiên trong chuỗi sau `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789` thì phần Header sẽ viết như sau:

    ```
    c char ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789
    ```

#### c. Phần body (dưới dòng `-----`):

**Vd:**
```
n            < Tạo một số 
[n; 10]      < Tạo mảng 1 chiều
[n; 10 - 3]  < Tạo mảng 2 chiều
```
Phần gentest sẽ chia làm 3 loại:

+ Tạo số, chữ hoặc chuỗi:

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
        
    Nếu bạn muốn tạo nhiều số trên một hàng thì bạn chỉ cần chèn giữa các tên define dấu "`; `" (lưu ý: sau dấu `; ` phải có dấu cách)

    + **Vd:** `a; b; c; ...`

+ Tạo mảng 1 chiều:

    Để tạo mảng 1 chiều, ta dùng cú pháp sau:

    ```
    [Tên_Define, Số_Hàng]
    ```

    **Trong đó:**

    + `Tên_Define`: là tên của define đã tạo trong phần Header, xác định giá trị của các số sẽ tạo bên trong mảng theo define ở phần Header

    + `Số_Hàng`: là số lượng hàng muốn tạo, có thể dùng biến đã được lưu từ trước.

    **Vd:**

    Để tạo một mảng với các giá trị bên trong ứng với define là `n` ở phần Header gồm 15 hàng, ta viết như sau:

    ```
    [n, 15]
    ```

+ Tạo mảng 2 chiều: 

    Để tạo mảng 2 chiều, ta dùng cú pháp sau:

    ```
    [Tên_Define, Số_Hàng - Số_Cột, Split]
    ```

    **Trong đó:**

    + `Tên_Define`: là tên của define đã tạo trong phần Header, xác định giá trị của các số sẽ tạo bên trong mảng theo define ở phần Header

    + `Số_Hàng`: là số lượng hàng muốn tạo, có thể dùng biến đã được lưu từ trước.

    + `Số_Cột`: là số lượng cột muốn tạo, có thể dùng biến đã được lưu từ trước.

    + `Split`: ký tự ngăn cách các gía trị trong cùng một hàng, để trong dấu ngoặc kép (`" "`)

    **Vd:**

    Để tạo một mảng với các giá trị bên trong ứng với define là `n` ở phần Header gồm 15 hàng và 5 cột, ngăn cách bởi dấu cách, ta viết như sau:

    ```
    [n, 15 - 5, " "]
    ```

#### d. Cú pháp đặc biệt:

+ Tạo một con số từ trong một khoảng xác định:

    ```
    [a - b]
    ```

    **Trong đó:**
    
    + `a`: Số bắt đầu, có thể là biến đã được lưu từ trước

    + `b`: Số kết thúc, có thể là biến đã được lưu từ trước

    **Ví dụ:**

    Đễ tạo một con số trong khoảng từ 1 đến n (biến `n` là biến đã được lưu giá trị từ trước), ta viết như sau:

    ```
    [1 - n]
    ```

+ Trả về giá trị của biến đã được lưu:

    ```
    [a]
    ```

    **Trong đó:**
    
    + `a`: Tên biến muốn kiểm tra giá trị.

    **Ví dụ:**

    Để kiểm tra giá trị của biến `n`, ta viết như sau:

    ```
    [n]
    ```

#### e. File config

Nội dung cơ bản của file config (`config.yaml`):

```yaml
MainCPP: file/main.cpp
IOFile: test
Count: 10
Range: [

]
Config: >
  n number 1 1000
  ------
  n
TestFolder: file/testcases/
OJFormatFolder:
ZipFile: file/testcase.zip
OJZipFile: 
DebugFile: true
LogMemory: true
TimeMeasure: true
```

**Trong đó:**

+ `IOFile`: Tên của file input và out (chỉ ghi tên, không ghi phần đuôi `.INP` hoặc `.OUT`). *

+ `MainCPP`: Địa chỉ nơi để file `C++` muốn test. *

+ `Count`: Số lượng testcase. *

+ `Range`: Ràng buộc của từng test. *

    **Lưu ý:**

    + Giá trị của Range được viết dưới định dạng:

        ```yaml
        [
            Rule_1,
            Rule_2,
            # ...
        ]
        ```
    
    + Giá trị của mỗi phần tử (`Rule_1`, `Rule_2`, ...) được viết theo dạng:

        ```yaml
        {
            range: [], # Khoảng giá trị
            count: 10, # Số lượng
            func: ""   # Địa chỉ file
        }
        ```

        **Trong đó:**
        
        + `range`: Khoảng giá trị của test, define tương ứng,
            
            **Lưu ý:** 
            
            + Giá trị của các phần tử lần lượt bằng `Min trong khoảng / Min của define` và `Max trong khoảng / Max của define` (**lưu ý**: giá trị luôn lớn hơn hoặc bằng 0 và bé hơn hoặc bằng 1).

            + `range` có hai định dạng:

                + Global Range (`[min, max]`): áp dụng cho toàn bộ biến (define) ở phần Header

                + Local Range (`[[min, max], [min, max], ...]`): áp dụng cho biến (define) theo từng dòng ở phần Header.

                **Lưu ý:** `min`, `max`: xem ở phần `Sau kiểu dữ liệu` ở [Phần Header](#b-phần-header-trên-dòng)

        + `count`: Số lượng test muốn áp dụng `Rule` này, có thể là một con số cố định hoặc viết dưới dạng phần trăm, khi này code sẽ từ động điều chỉnh theo số lượng test (vd: `30%` = `0.30`)

        + `func`: Địa chỉ dẫn đến file có code JavaScript hoặc TypeScript xuất ra hàm để kiểm tra test; nếu hàm trả về `false` thì tiến hành tạo lại test, ngược lại thì tiếp tục

        **Ví dụ:**

        Ta có đầu vào như sau:

        ```
        n number 0 1000
        a number 0 10000
        ------
        const n
        [a, 1 - n, " "]
        ```

        Ta muốn 50% test đầu có giá trị 0 <= N <= 10 và 0 <= A <= 1000, `Rule` sẽ được viết như sau:
        ```yaml
        {
            range: [[0, 00.1],        [0, 0.1]],
            #       ^                 ^
            #       Ràng buộc của N | Ràng buộc của A
            count: 0.5
        }
        ```

+ `Config`: [Config của code](#3-config-code). *

+ `TestFolder`: Thư mục để Testcase. *

+ `OJFormatFolder`: Thư mục để file Test theo format của [VNOJ](https://oj.vnoi.info).

+ `ZipFile`: Địa chỉ nơi để file zip.

+ `OJZipFile`: Địa chỉ nơi để file zip theo định dạng của `VNOJ`.

+ `DebugFile`: Xuất file `debug.log` (ghi lại các message mà compile xuất ra) (giá trị là `true` hoặc `False`)

+ `LogMemory`: Xuất thông tin về lượng RAM đang sử dụng (giá trị là `true` hoặc `false`)

+ `MeasureTime`: Xuất thông tin về thời gian chạy của từng test (chỉ mang tính chất tham khảo) (giá trị là `true` hoặc `false`)

**Lưu ý:** * Quan trọng, không được bỏ trống

### 4. Chạy code:

#### a. Lưu ý:

Khi lần đầu tải code về hoặc khi update code, vui lòng chạy lệnh:

|Module|Lệnh (khi có `NodeJs`)| Lệnh (khi có `Bun`)|Của runtime enviroment|
|---|---|---|---|
|[NPM](https://docs.npmjs.com/cli/v10/commands/npm-install)|`npm run npmBuild`|`bun run npmBuild`|`NodeJS`|
|[Bun](https://bun.sh/docs/cli/install)|`npm run bunBuild`|`bun run bunBuild`| `Bun`
|[Yarn](https://yarnpkg.com/cli/install)|`npm run yarnBuild`|`bun run yarnBuild`| Không có|

#### b. Tạo file config

Chỉnh sửa file config theo [File config](#e-file-config) và để đặt tên là `config.yaml`

#### c. Chạy code

Trước khi chạy code, vui lòng kiểm tra file `main.cpp` đã ở đúng vị trí chưa.

Khi chạy code, vui lòng chạy lệnh:

|Runtime enviroment|Lệnh (khi có `NodeJs`)|Lệnh (khi có `Bun`)|
|---|---|---|
|NodeJS|`npm run nodeRun`|`bun run nodeRun`|
|Bun|`npm run bunRun`|`bun run bunRun`|
|Deno|`npm run denoRun`|`bun run denoRun`|