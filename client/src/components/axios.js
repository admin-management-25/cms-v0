import Axios from "axios";

const axios = Axios.create({
  baseURL: "https://cms-v0.vercel.app", // Replace with your backend API URL
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

export default axios;
