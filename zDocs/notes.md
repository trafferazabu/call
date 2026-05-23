this app is 100% Vanilla JavaScript (ES6), HTML5, and CSS3

to run, from terminal
D:\call> npm start

then visit http://localhost:3000/



---------------

1. Test the Front-End Client Logic:
powershell
node --check public/app.js


2. Test the Back-End Token Server:
powershell
node --check server.js

----

Advanced Alternative: ESLint
If you want to catch logical bugs (like referencing undefined variables or unused imports), you can run a lightweight linter:

powershell
npx eslint public/app.js