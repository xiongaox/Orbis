import { localPrivateStore } from './localPrivateStore';

export interface UserProfile {
  id: string;
  email?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  website?: string;
  birth_date?: string;
  updated_at?: string;
}

export const profileService = {
  async getProfile(userId: string) {
    const record = await localPrivateStore.get(userId, 'profile', userId);
    return (record?.payload as UserProfile | undefined) ?? null;
  },
  async updateProfile(userId: string, updates: Partial<UserProfile>) {
    const existing = await this.getProfile(userId);
    const profile: UserProfile = {
      ...(existing ?? { id: userId }),
      ...updates,
      id: userId,
      updated_at: new Date().toISOString(),
    };
    await localPrivateStore.put(userId, 'profile', profile as unknown as Record<string, unknown>, userId);
    return profile;
  },
};
