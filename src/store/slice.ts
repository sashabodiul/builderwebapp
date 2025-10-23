import { createSlice } from "@reduxjs/toolkit";
import {User} from "../requests/user/types.ts";

export const dataSlice = createSlice({
	name: "data",
	initialState: {
		user: null as User | null,
	},
	reducers: {
		setUser: (state, action) => {
			state.user = action.payload;
		}
	},
});

export const {
	setUser,
} = dataSlice.actions;

export default dataSlice.reducer;
