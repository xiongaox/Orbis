import type { Case } from '../types';
import { calculateBazi } from './bazi/caseHelper';

const STORAGE_KEY = 'reticle_cases';

// Initial seed data - with defensive initialization
function initSeedData(): Case[] {
    try {
        const rawCases: Case[] = [
            {
                id: '1',
                name: '案例6',
                gender: 'female',
                birth_date: '1998-10-16T00:08:00',
                created_at: new Date().toISOString(),
            },
            {
                id: '2',
                name: '案例2',
                gender: 'male',
                birth_date: '1985-03-15T12:00:00', // Noon
                created_at: new Date().toISOString(),
            }
        ];
        return rawCases.map(c => ({
            ...c,
            ...calculateBazi(c.birth_date, c.gender as 'male' | 'female')
        }) as Case);
    } catch (e) {
        console.error('Failed to initialize SEED_DATA:', e);
        return [];
    }
}

const SEED_DATA: Case[] = initSeedData();

export const caseService = {
    getStoredCases(): Case[] {
        const json = localStorage.getItem(STORAGE_KEY);
        let cases: Case[] = json ? JSON.parse(json) : SEED_DATA;

        // Data Migration: Ensure all cases have the latest calculated fields
        let hasUpdates = false;
        cases = cases.map(c => {
            // Check if missing new fields or if hidden_stems/kong_wang is in old format
            const isOldHiddenStems = c.hidden_stems && c.hidden_stems.length > 0 && typeof c.hidden_stems[0] === 'string';
            const isOldKongWang = typeof c.kong_wang === 'string';

            if (!c.main_stars || !c.hidden_stems || isOldHiddenStems || isOldKongWang || !c.shen_sha || c.shen_sha.length === 0) {
                hasUpdates = true;
                // Recalculate Bazi data
                return {
                    ...c,
                    ...calculateBazi(c.birth_date, c.gender)
                } as Case;
            }
            return c;
        });

        if (!json || hasUpdates) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
        }

        return cases;
    },

    async getCases(): Promise<Case[]> {
        // Simulate async for compatibility
        return this.getStoredCases();
    },

    async getCaseById(id: string): Promise<Case | null> {
        const cases = this.getStoredCases();
        return cases.find(c => c.id === id) || null;
    },

    async updateCase(updated: Case): Promise<void> {
        const cases = this.getStoredCases();
        const index = cases.findIndex(c => c.id === updated.id);
        if (index !== -1) {
            // Recalculate Bazi on update
            const baziInfo = calculateBazi(updated.birth_date, updated.gender);
            cases[index] = {
                ...updated,
                ...baziInfo
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
        }
    },

    async createCase(newCase: Omit<Case, 'id' | 'created_at'>): Promise<Case> {
        const cases = this.getStoredCases();
        const id = Date.now().toString();
        const baziInfo = calculateBazi(newCase.birth_date, newCase.gender);

        const created: Case = {
            id,
            created_at: new Date().toISOString(),
            ...newCase,
            ...baziInfo
        } as Case;

        cases.unshift(created);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
        return created;
    }
};
