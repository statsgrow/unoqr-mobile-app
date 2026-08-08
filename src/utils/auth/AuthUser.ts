import type { UserType } from "./UserTypes";

const guestUser: UserType = {
  member: {
    first_name: "Guest",
    last_name: "User",
    old_id: null
  }
};

export async function getUser({ errorOnFail }: { errorOnFail?: boolean } = {}): Promise<UserType | null> {
  if (errorOnFail) {
    return guestUser;
  }

  return guestUser;
}

export async function removeUserTokens(): Promise<void> {
  return;
}