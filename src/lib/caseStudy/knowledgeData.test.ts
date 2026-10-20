import { describe, expect, it } from 'vitest';
import { KNOWLEDGE_ITEMS, NO_OUTLINE_IDS, getKnowledgeOutlineTitle } from './knowledgeData';

describe('getKnowledgeOutlineTitle', () => {
    it('无大纲条目返回 null（移动端右抽屉据此留空）', () => {
        for (const id of NO_OUTLINE_IDS) {
            expect(getKnowledgeOutlineTitle(id)).toBeNull();
        }
    });

    it('除无大纲条目外，每个常识篇目都有大纲标题', () => {
        const missing = KNOWLEDGE_ITEMS
            .filter((item) => !NO_OUTLINE_IDS.includes(item.id))
            .filter((item) => !getKnowledgeOutlineTitle(item.id))
            .map((item) => item.id);
        expect(missing).toEqual([]);
    });

    it('未知 id 返回 null', () => {
        expect(getKnowledgeOutlineTitle('not-exist')).toBeNull();
    });
});
