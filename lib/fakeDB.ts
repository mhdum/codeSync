const users: { email: string; password: string }[] = []

export const saveUser = (user: { email: string; password: string }) => {
  users.push(user)
}

export const getUserByEmail = (email: string) => {
  return users.find(u => u.email === email)
}

export const getAllUsers = () => {
  return users
}
