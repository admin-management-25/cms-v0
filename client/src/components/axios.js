import Axios from "axios";

const axios = Axios.create({
  baseURL: "http://localhost:5000", // Replace with your backend API URL
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

export default axios;
