/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
     "./node_modules/react-native-paper/**/*.js"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: ["nativewind/babel"],
}

