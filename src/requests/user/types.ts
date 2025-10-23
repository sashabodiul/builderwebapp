export type LoginResponse = {
  token: string;
  expiresIn: number;
  user: User;
};

export type User = {
  _id: string;
};

