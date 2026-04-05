import { Elysia, t } from 'elysia'
import { html, Html } from '@elysiajs/html'
import { swagger } from '@elysiajs/swagger'
import { db } from './db'
import { todos } from './db/schema'
import { eq, desc } from 'drizzle-orm'

// --- JSX Components ---

const BaseLayout = ({ children }: { children: any }) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BETH Todo App</title>
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .htmx-indicator { display: none; }
        .htmx-request .htmx-indicator { display: inline; }
    </style>
</head>
<body class="bg-gray-50 min-h-screen py-12 px-4">
    <div class="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8 border border-gray-100">
        <h1 class="text-3xl font-bold text-gray-900 mb-8 text-center">Todo List</h1>
        ${children}
    </div>
</body>
</html>
`

const TodoItem = ({ id, content, completed }: { id: number, content: string, completed: boolean }) => (
  <li id={`todo-${id}`} class="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 group">
    <div class="flex items-center gap-3 flex-1 cursor-pointer" 
         hx-patch={`/todos/${id}`} 
         hx-target={`#todo-${id}`} 
         hx-swap="outerHTML">
        <div class={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${completed ? 'bg-green-500 border-green-500' : 'border-gray-300 group-hover:border-green-400'}`}>
            {completed && (
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
            )}
        </div>
        <span class={`text-gray-700 transition-all ${completed ? 'line-through text-gray-400' : ''}`}>
            {content}
        </span>
    </div>
    <button hx-delete={`/todos/${id}`} 
            hx-target={`#todo-${id}`} 
            hx-swap="outerHTML"
            class="text-gray-300 hover:text-red-500 transition-colors ml-4 p-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
    </button>
  </li>
)

// --- Server ---

const app = new Elysia()
  .use(html())
  .use(swagger())
  
  // --- Frontend Routes ---
  
  .get('/', async () => {
    const allTodos = await db.select().from(todos).orderBy(desc(todos.id));
    
    return BaseLayout({
      children: `
        <form hx-post="/todos" hx-target="#todo-list" hx-swap="afterbegin" hx-on::after-request="this.reset()" class="flex gap-2 mb-6">
            <input type="text" name="content" placeholder="What needs to be done?" required
                   class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all">
            <button type="submit" class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
                Add
            </button>
        </form>
        <ul id="todo-list" class="divide-y divide-gray-100">
            ${allTodos.map(todo => TodoItem(todo)).join('')}
        </ul>
      `
    })
  })

  // --- API / HTMX Handlers ---

  .post('/todos', async ({ body }) => {
    const [newTodo] = await db.insert(todos).values({
      content: body.content,
      completed: false
    }).returning();
    
    return TodoItem(newTodo)
  }, {
    body: t.Object({
      content: t.String()
    })
  })

  .patch('/todos/:id', async ({ params: { id }, error }) => {
    const todoId = Number(id);
    const [todo] = await db.select().from(todos).where(eq(todos.id, todoId));
    if (!todo) return error(404, 'Todo not found');
    
    const [updatedTodo] = await db.update(todos)
      .set({ completed: !todo.completed })
      .where(eq(todos.id, todoId))
      .returning();
      
    return TodoItem(updatedTodo)
  }, {
    params: t.Object({
      id: t.String()
    })
  })

  .delete('/todos/:id', async ({ params: { id } }) => {
    const todoId = Number(id);
    await db.delete(todos).where(eq(todos.id, todoId));
    
    return '' // Remove from DOM by returning nothing
  }, {
    params: t.Object({
      id: t.String()
    })
  })

  .listen(3000)

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`)