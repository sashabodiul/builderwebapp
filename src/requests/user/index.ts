import apiRequest, {ApiResponse} from "../config.ts";
import {LoginResponse} from "./types.ts";
import {setUser} from "../../store/slice.ts";
import {useDispatch} from "react-redux";

export const login = async (dispatch: ReturnType<typeof useDispatch>): Promise<ApiResponse<LoginResponse>> => {
  let initData: string | object | undefined = window.Telegram?.WebApp?.initData;
  let route: string = "/user/login";
  if (import.meta.env.VITE_DEBUG) {
    initData = {};
    route = "/user/login-dev";
  }
  const response: ApiResponse<LoginResponse> = await apiRequest<LoginResponse>("POST", route, {}, {initData});
  const {data} = response;

  localStorage.setItem("token", data.token);
  localStorage.setItem("expiresIn", String(data.expiresIn));

  dispatch(setUser(data.user));
  return response;
};