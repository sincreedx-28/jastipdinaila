# Cetak Label Thermal — Konsep (belum diimplementasi)

Status: konsep, dibahas 2026-07-20. Belum ada kode aplikasi, ini catatan buat lanjutin dari device lain.

## Masalah sekarang

Alamat tujuan datang dari WhatsApp -> dicopy manual -> dirapihin -> paste ke template Word yang marginnya sudah pas -> print ke printer thermal yang nyambung ke PC Windows 11.

## Target

Ganti langkah Word dengan form di HP: paste alamat mentah dari WA, pilih ekspedisi dari dropdown, pengirim (Jastipdinaila + no HP) sudah fixed, tap "Cetak Label" -> tercetak di printer thermal yang nyambung ke PC. Alamat tetap dirapihin manual sebelum dicetak, tidak ada auto-parsing teks WA yang direncanakan.

## Arsitektur yang disepakati

- Tabel `print_jobs` di app ini, diisi lewat endpoint yang ada di balik auth admin yang sudah ada (Supabase Auth + `AdminUser`).
- Agent kecil di PC Windows yang **polling keluar** secara berkala buat ambil & cetak job yang pending — bukan buka port masuk.
- Agent otentikasi pakai token terpisah dari password admin.
- Semua trafik HTTPS.
- Alasan desain outbound-only: PC gak punya port yang bisa diakses dari luar tanpa izin (concern keamanan Agung — background SOC, khawatir unauthorized access dari luar).
- Jangkauan: dari mana aja, bukan cuma satu WiFi — karena sering proses order pas lagi di luar (mis. lagi belanja).

## Yang masih ditunggu sebelum mulai coding

- Merk/tipe printer thermal (nentuin apakah kirim raw ESC/POS command atau print lewat driver Windows biasa).
- File template Word yang sekarang dipakai, buat nyamain margin & layout label persis.

## Mockup

`thermal-label-printing-mockup.html` di folder ini — draf tampilan form di HP + preview hasil cetak + diagram alur. Buka langsung di browser, belum wired ke app.
