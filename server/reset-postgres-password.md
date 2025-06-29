# 🔧 Cách Reset Password PostgreSQL trên Windows

## Phương pháp 1: Sử dụng pgAdmin (Dễ nhất)

1. **Mở pgAdmin** (nếu đã cài)
2. **Connect với authentication method khác**
3. **Right-click trên server** → Properties → Connection
4. **Đổi password** trong phần Password

## Phương pháp 2: Command Line (Khuyến nghị)

### Bước 1: Tìm file pg_hba.conf
```bash
# Thường ở đây:
C:\Program Files\PostgreSQL\15\data\pg_hba.conf
# Hoặc:
C:\Users\[Username]\AppData\Local\PostgreSQL\data\pg_hba.conf
```

### Bước 2: Backup và sửa file pg_hba.conf
1. **Backup file gốc**:
   ```bash
   copy "C:\Program Files\PostgreSQL\15\data\pg_hba.conf" "C:\Program Files\PostgreSQL\15\data\pg_hba.conf.backup"
   ```

2. **Mở file với quyền Admin** (Notepad as Administrator)

3. **Tìm dòng này**:
   ```
   # TYPE  DATABASE        USER            ADDRESS                 METHOD
   local   all             postgres                                md5
   host    all             all             127.0.0.1/32            md5
   ```

4. **Đổi thành**:
   ```
   # TYPE  DATABASE        USER            ADDRESS                 METHOD
   local   all             postgres                                trust
   host    all             all             127.0.0.1/32            trust
   ```

### Bước 3: Restart PostgreSQL Service
```bash
# Mở Command Prompt as Administrator
net stop postgresql-x64-15
net start postgresql-x64-15

# Hoặc dùng Services.msc
# Tìm "PostgreSQL" → Right-click → Restart
```

### Bước 4: Đổi password
```bash
# Mở Command Prompt
psql -U postgres

# Trong psql prompt:
ALTER USER postgres PASSWORD 'your_new_password';
\q
```

### Bước 5: Khôi phục bảo mật
1. **Đổi lại file pg_hba.conf** từ `trust` về `md5`
2. **Restart PostgreSQL service** lần nữa

## Phương pháp 3: Reinstall PostgreSQL (Nếu cần)

1. **Uninstall PostgreSQL** từ Control Panel
2. **Xóa folder data** (nếu còn):
   ```
   C:\Program Files\PostgreSQL\
   C:\Users\[Username]\AppData\Local\PostgreSQL\
   ```
3. **Download và cài lại** từ: https://www.postgresql.org/download/windows/
4. **Nhớ password** lần này! 😄

## Phương pháp 4: Sử dụng Docker (Alternative)

```bash
# Cài Docker Desktop
# Chạy PostgreSQL container
docker run --name postgres-animestream -e POSTGRES_PASSWORD=postgres123 -p 5432:5432 -d postgres:15

# Update .env file
DB_PASSWORD=postgres123
```

## 🎯 Sau khi reset password:

1. **Update file .env**:
   ```env
   DB_PASSWORD=your_new_password
   ```

2. **Test connection**:
   ```bash
   npm run setup-db
   ```

3. **Start server**:
   ```bash
   npm start
   ```

## 💡 Tips để không quên password:

1. **Dùng password đơn giản** cho development: `postgres`, `123456`, `admin`
2. **Lưu vào file .env** ngay lập tức
3. **Backup file .env** vào nơi an toàn
4. **Dùng password manager** như LastPass, 1Password

## 🔍 Kiểm tra PostgreSQL đang chạy:

```bash
# Check service
sc query postgresql-x64-15

# Check port
netstat -an | findstr 5432

# Test connection
psql -U postgres -h localhost -p 5432
```