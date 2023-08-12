import axios from "axios";

import { UserModel } from "../models/User";

class AuthService {
    setUserInlocalStorage(data: UserModel) {
        localStorage.setItem("user", JSON.stringify(data));
    }

    async login(username: string, password: string): Promise<UserModel> {
        const response = await axios.post("http://127.0.0.1:8000/auth-token/", { username, password });
        if (!response.data.token) {
            return response.data;
        }
        this.setUserInlocalStorage(response.data);
        return response.data;
    }

    logout() {
        localStorage.removeItem("user");
    }
    getCurrentUser() {
        const user = localStorage.getItem("user")!;
        return JSON.parse(user);
    }
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new AuthService();
