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
  async getProfile() {
    const record = await localPrivateStore.get('profile', 'profile');
    return (record?.payload as UserProfile | undefined) ?? null;
  },
  async updateProfile(updates: Partial<UserProfile>) {
    const existing = await this.getProfile();
    const profile: UserProfile = {
      ...(existing ?? { id: 'profile' }),
      ...updates,
      id: 'profile',
      updated_at: new Date().toISOString(),
    };
    await localPrivateStore.put('profile', profile as unknown as Record<string, unknown>, 'profile');
    return profile;
  },
};
