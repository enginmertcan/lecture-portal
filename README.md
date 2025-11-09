# Trendyol Lecture Portal (Vue 3)

Vue 3 + Vite arayüzü Trendyol Lecture Management API’sinin (Spring Boot) canlı Railway dağıtımına bağlanır. JWT tabanlı kimlik doğrulama yapar, role bazlı operasyonları (lectures, classrooms, schedules, enrollments, grade components, users) tek konsolda sunar.

## Başlarken

```bash
cd lecture-portal
npm install
```

### Çalıştırma

```bash
npm run dev
```

Varsayılan olarak `http://localhost:5173` portunda açılır.

### Prod / Stage API seçimi

Uygulama varsayılan olarak `https://api-production-7b6a.up.railway.app` taban URL’ini kullanır. Farklı bir backend (ör. lokal Spring instance’ı) hedeflemek için `.env` ya da `.env.local` dosyasına:

```
VITE_API_BASE_URL=http://localhost:8080
```

## Uygulama Haritası

- **Auth**: `/login` ve `/register` ekranları `/api/auth/login` + `/api/auth/register` uçlarını kullanır. Başarılı yanıtta dönen access/refresh token’lar Pinia store & localStorage senkronunda tutulur, `/api/auth/refresh` interceptor tarafından otomatik çağrılır.
- **Dashboard**: `/api/lectures`, `/api/lecture-schedules`, `/api/enrollments`, `/api/classrooms`, `/api/grade-components` uçları paralel çekilerek sayısal kartlar ve “recent activity” listeleri oluşturulur.
- **Lectures**: Ders listeleme, arama, yeni ders oluşturma (`POST /api/lectures`), silme ve seçili ders için program (`/api/lecture-schedules/lecture/{id}`) + not bileşenlerini (`/api/grade-components?lectureId=`) gösterir.
- **Schedules**: Program grid’i + yeni oturum planlama (`POST /api/lecture-schedules`) ve silme işleri. Drop-down verileri `/api/lectures`, `/api/classrooms`, `/api/schedule-slots` isteklerinden gelir.
- **Classrooms / Slots**: CRUD operasyonlarıyla `/api/classrooms` ve `/api/schedule-slots` uçlarını yönetir.
- **Grade Components**: Filtreleyerek listeleme (lecture bazlı veya paginated), yeni bileşen tanımlama (`POST /api/grade-components`), silme.
- **Enrollments**: `/api/enrollments` sayfalı liste + lecture/student filtreleme, yeni kayıt oluşturma (`POST /api/enrollments`), onay/drop/promote işlemleri, tamamla (`/complete`) ve bileşen notu ekleme (`/grades`). Gerekli rollerde backend 403 dönerse kullanıcıya mesaj gösterilir.
- **Users**: `/api/users` sayfalı liste veya role göre filtreleme (`/api/users/by-role`), yeni kullanıcı ekleme (`POST /api/users`), silme (`DELETE /api/users?id=`).

## Teknik Notlar

- **Global HTTP Client**: `src/api/httpClient.js` içindeki Axios instance’ı Authorization header’ını ekler; 401 dönerse refresh token döngüsünü yönetir.
- **Durum yönetimi**: `src/stores/auth.js` Pinia store’u JWT + refresh token saklama, login/logout, refresh workflows.
- **Stillendirme**: Tek `src/style.css` dosyasında responsif grid, kart, tablo ve form düzenleri merkezi olarak tanımlandı.
- **Swagger**: API dokümantasyonunu canlı ortamda incelemek için [swagger-ui](https://api-production-7b6a.up.railway.app/swagger-ui/index.html#/).

## Notlar

- Backend JWT secret ve DB ayarları `api/` altında konfigüre. Frontend sadece REST tükettiği için proxy ihtiyacı yok.
- Role tabanlı yetkiler backend tarafından enforce edilir; frontend tarafında kullanıcı giriş kontrolü yapılır, yasaklanan işlemlerde hata mesajı UI’da gösterilir.
