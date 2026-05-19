import { describe, it, before, after, mock } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, mkdirSync, readFileSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

let tempDir

before(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'promptbox-test-'))
  mkdirSync(join(tempDir, 'data'), { recursive: true })
})

after(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

// ---- Pure data helpers (no Electron needed) ----

const UNCATEGORIZED_ID = 'cat-uncategorized'

function createPrompt(data, prompts) {
  const now = new Date().toISOString()
  const minOrder = prompts.length > 0
    ? Math.min(...prompts.map(p => p.sortOrder))
    : 0
  const prompt = {
    id: data.id || crypto.randomUUID(),
    title: data.title || '',
    content: data.content || '',
    categoryId: data.categoryId || UNCATEGORIZED_ID,
    tags: data.tags || [],
    color: data.color,
    createdAt: data.createdAt || now,
    updatedAt: now,
    usageCount: data.usageCount || 0,
    sortOrder: minOrder - 1,
  }
  prompts.push(prompt)
  return prompt
}

function getAllPrompts(prompts) {
  return [...prompts].sort((a, b) => a.sortOrder - b.sortOrder)
}

function updatePrompt(id, input, prompts) {
  const idx = prompts.findIndex(p => p.id === id)
  if (idx === -1) return null
  prompts[idx] = { ...prompts[idx], ...input, id, updatedAt: new Date().toISOString() }
  return prompts[idx]
}

function deletePrompt(id, prompts) {
  const len = prompts.length
  const filtered = prompts.filter(p => p.id !== id)
  return { deleted: filtered.length !== len, prompts: filtered }
}

function deletePrompts(ids, prompts) {
  const before = prompts.length
  const filtered = prompts.filter(p => !ids.includes(p.id))
  return { deleted: before - filtered.length, prompts: filtered }
}

function reorderPrompts(ids, prompts) {
  const promptMap = new Map(prompts.map(p => [p.id, p]))
  return ids.map((id, i) => {
    const p = promptMap.get(id)
    if (p) p.sortOrder = i
    return p
  }).filter(Boolean)
}

function searchPrompts(query, prompts) {
  const q = query.toLowerCase()
  return prompts.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.content.toLowerCase().includes(q) ||
    p.tags.some(t => t.toLowerCase().includes(q))
  )
}

function createCategory(input, categories) {
  const cat = {
    id: crypto.randomUUID(),
    name: input.name || '',
    color: input.color || '#8b5cf6',
    sortOrder: input.sortOrder ?? categories.length,
  }
  categories.push(cat)
  return cat
}

function updateCategory(id, input, categories) {
  const idx = categories.findIndex(c => c.id === id)
  if (idx === -1) return null
  categories[idx] = { ...categories[idx], ...input }
  return categories[idx]
}

function deleteCategory(id, categories, prompts) {
  if (id === UNCATEGORIZED_ID) return { deleted: false, categories, prompts }
  const len = categories.length
  const filtered = categories.filter(c => c.id !== id)
  prompts.forEach(p => {
    if (p.categoryId === id) p.categoryId = UNCATEGORIZED_ID
  })
  return { deleted: filtered.length !== len, categories: filtered, prompts }
}

function reorderCategories(ids, categories) {
  const catMap = new Map(categories.map(c => [c.id, c]))
  return ids.map((id, i) => {
    const c = catMap.get(id)
    if (c) c.sortOrder = i
    return c
  }).filter(Boolean)
}

// ---- Tests ----

describe('Prompts CRUD', () => {

  describe('createPrompt', () => {
    it('should create a prompt with default values', () => {
      const prompts = []
      const p = createPrompt({ title: 'Test', content: 'Hello' }, prompts)

      assert.equal(p.title, 'Test')
      assert.equal(p.content, 'Hello')
      assert.equal(p.categoryId, UNCATEGORIZED_ID)
      assert.equal(p.usageCount, 0)
      assert.ok(p.id)
      assert.equal(prompts.length, 1)
    })

    it('should assign sortOrder lower than existing minimum', () => {
      const prompts = [
        { id: '1', title: 'A', sortOrder: 5 },
        { id: '2', title: 'B', sortOrder: 10 },
      ]
      const p = createPrompt({ title: 'New' }, prompts)
      assert.equal(p.sortOrder, 4) // min(5,10) - 1 = 4
    })
  })

  describe('getAllPrompts', () => {
    it('should return prompts sorted by sortOrder ascending', () => {
      const prompts = [
        { id: '1', title: 'B', sortOrder: 2 },
        { id: '2', title: 'A', sortOrder: 1 },
        { id: '3', title: 'C', sortOrder: 3 },
      ]
      const sorted = getAllPrompts(prompts)
      assert.equal(sorted[0].title, 'A')
      assert.equal(sorted[1].title, 'B')
      assert.equal(sorted[2].title, 'C')
    })
  })

  describe('updatePrompt', () => {
    it('should update prompt fields', () => {
      const prompts = [{ id: 'p1', title: 'Old', content: '', tags: [], sortOrder: 0 }]
      const updated = updatePrompt('p1', { title: 'New Title' }, prompts)
      assert.equal(updated.title, 'New Title')
      assert.equal(prompts[0].title, 'New Title')
    })

    it('should return null for non-existent id', () => {
      const result = updatePrompt('nonexistent', { title: 'X' }, [])
      assert.equal(result, null)
    })
  })

  describe('deletePrompt', () => {
    it('should remove prompt by id', () => {
      const prompts = [{ id: 'p1' }, { id: 'p2' }]
      const result = deletePrompt('p1', prompts)
      assert.equal(result.deleted, true)
      assert.equal(result.prompts.length, 1)
      assert.equal(result.prompts[0].id, 'p2')
    })

    it('should return false when id not found', () => {
      const prompts = [{ id: 'p1' }]
      const result = deletePrompt('p2', prompts)
      assert.equal(result.deleted, false)
      assert.equal(result.prompts.length, 1)
    })
  })

  describe('deletePrompts (batch)', () => {
    it('should delete multiple prompts', () => {
      const prompts = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
      const result = deletePrompts(['a', 'c'], prompts)
      assert.equal(result.deleted, 2)
      assert.equal(result.prompts.length, 1)
      assert.equal(result.prompts[0].id, 'b')
    })
  })

  describe('reorderPrompts', () => {
    it('should reorder prompts by given ids', () => {
      const prompts = [
        { id: 'p1', title: 'First', sortOrder: 0 },
        { id: 'p2', title: 'Second', sortOrder: 1 },
        { id: 'p3', title: 'Third', sortOrder: 2 },
      ]
      const reordered = reorderPrompts(['p3', 'p1', 'p2'], prompts)
      assert.equal(reordered[0].id, 'p3')
      assert.equal(reordered[0].sortOrder, 0)
      assert.equal(reordered[1].id, 'p1')
      assert.equal(reordered[1].sortOrder, 1)
      assert.equal(reordered[2].id, 'p2')
      assert.equal(reordered[2].sortOrder, 2)
    })
  })

  describe('searchPrompts', () => {
    const prompts = [
      { id: '1', title: 'Security Review', content: 'Check auth', tags: ['security'] },
      { id: '2', title: 'API Design', content: 'REST endpoints', tags: ['api', 'design'] },
      { id: '3', title: 'Debug', content: 'Fix the auth bug', tags: ['bug'] },
    ]

    it('should search by title', () => {
      const results = searchPrompts('security', prompts)
      assert.equal(results.length, 1)
      assert.equal(results[0].id, '1')
    })

    it('should search by content', () => {
      const results = searchPrompts('endpoints', prompts)
      assert.equal(results.length, 1)
      assert.equal(results[0].id, '2')
    })

    it('should search by tags', () => {
      const results = searchPrompts('api', prompts)
      assert.equal(results.length, 1)
      assert.equal(results[0].id, '2')
    })

    it('should be case-insensitive', () => {
      const results = searchPrompts('SECURITY', prompts)
      assert.equal(results.length, 1)
      assert.equal(results[0].id, '1')
    })

    it('should return empty for no match', () => {
      const results = searchPrompts('zzzzz', prompts)
      assert.equal(results.length, 0)
    })
  })
})

describe('Categories CRUD', () => {
  describe('createCategory', () => {
    it('should create category with defaults', () => {
      const cats = []
      const c = createCategory({ name: 'Test' }, cats)
      assert.equal(c.name, 'Test')
      assert.equal(c.color, '#8b5cf6')
      assert.ok(c.id)
      assert.equal(cats.length, 1)
    })
  })

  describe('updateCategory', () => {
    it('should update category fields', () => {
      const cats = [{ id: 'c1', name: 'Old', color: '#000', sortOrder: 0 }]
      updateCategory('c1', { name: 'New', color: '#fff' }, cats)
      assert.equal(cats[0].name, 'New')
      assert.equal(cats[0].color, '#fff')
    })
  })

  describe('deleteCategory', () => {
    it('should not delete uncategorized', () => {
      const cats = [{ id: UNCATEGORIZED_ID }]
      const result = deleteCategory(UNCATEGORIZED_ID, cats, [])
      assert.equal(result.deleted, false)
    })

    it('should move prompts to uncategorized', () => {
      const cats = [{ id: 'c1', name: 'Old' }, { id: UNCATEGORIZED_ID }]
      const prompts = [{ id: 'p1', categoryId: 'c1' }]
      const result = deleteCategory('c1', cats, prompts)
      assert.equal(result.deleted, true)
      assert.equal(result.categories.length, 1)
      assert.equal(prompts[0].categoryId, UNCATEGORIZED_ID)
    })
  })

  describe('reorderCategories', () => {
    it('should reorder by given ids', () => {
      const cats = [
        { id: 'a', sortOrder: 0 },
        { id: 'b', sortOrder: 1 },
        { id: 'c', sortOrder: 2 },
      ]
      const reordered = reorderCategories(['c', 'a', 'b'], cats)
      assert.equal(reordered[0].id, 'c')
      assert.equal(reordered[1].id, 'a')
      assert.equal(reordered[2].id, 'b')
    })
  })
})
