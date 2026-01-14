#ใช้ Node.js เวอร์ชัน 20 เป็นฐาน
FROM node:20 

#โฟลเดอร์ทำงานภายในคอนเทนเนอร์
WORKDIR /app

#ก็อปทุกอย่างเข้าไป
COPY . .

#ติดตั้ง dependencies
RUN npm install

#รันคำสั่งเพื่อเริ่มแอปพลิเคชัน
CMD ["npm", "run", "dev"]
