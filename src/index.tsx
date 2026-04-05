import { Elysia, t } from 'elysia'
import { html, Html } from '@elysiajs/html'
import { swagger } from '@elysiajs/swagger'
import { db } from './db'
import { todos } from './db/schema'
import { eq, desc } from 'drizzle-orm'

// --- JSX Components ---

const BaseLayout = ({ children }: { children: any }) => `
<!DOCTYPE html>
<html lang="en" class="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BETH Todo App</title>
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    animation: {
                        'fade-in': 'fadeIn 0.3s ease-out',
                        'slide-up': 'slideUp 0.4s ease-out',
                    },
                    keyframes: {
                        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
                        slideUp: { '0%': { transform: 'translateY(10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
                    }
                }
            }
        }

        // Dark mode logic
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }

        function toggleTheme() {
            if (document.documentElement.classList.contains('dark')) {
                document.documentElement.classList.remove('dark')
                localStorage.theme = 'light'
            } else {
                document.documentElement.classList.add('dark')
                localStorage.theme = 'dark'
            }
        }
    </script>
    <style>
        .htmx-indicator { display: none; }
        .htmx-request .htmx-indicator { display: inline; }
        .todo-item { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .todo-item.htmx-swapping { opacity: 0; transform: scale(0.95); }
    </style>
</head>
<body class="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen transition-colors duration-300">
    <div class="max-w-xl mx-auto py-16 px-6">
        <header class="flex justify-between items-center mb-12 animate-fade-in">
            <div>
                <h1 class="text-4xl font-extrabold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">Tasks</h1>
                <p class="text-slate-500 dark:text-slate-400 font-medium">Get things done, beautifully.</p>
            </div>
            <button onclick="toggleTheme()" class="p-3 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 hidden dark:block text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h1M4 9h1m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 block dark:hidden text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
            </button>
        </header>
        
        <main class="animate-slide-up">
            ${children}
        </main>
    </div>
</body>
</html>
`

const TodoItem = ({ id, content, completed }: { id: number, content: string, completed: boolean }) => (
  <li id={`todo-${id}`} class="todo-item group flex items-center justify-between p-4 mb-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900 transition-all">
    <div class="flex items-center gap-4 flex-1 cursor-pointer" 
         hx-patch={`/todos/${id}`} 
         hx-target={`#todo-${id}`} 
         hx-swap="outerHTML swap:0.3s">
        <div class={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all ${completed ? 'bg-indigo-500 border-indigo-500 shadow-lg shadow-indigo-500/30' : 'border-slate-300 dark:border-slate-700 group-hover:border-indigo-400'}`}>
            {completed && (
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
            )}
        </div>
        <span class={`text-lg font-medium transition-all ${completed ? 'line-through text-slate-400 dark:text-slate-600 opacity-70' : 'text-slate-700 dark:text-slate-200'}`}>
            {content}
        </span>
    </div>
    <button hx-delete={`/todos/${id}`} 
            hx-target={`#todo-${id}`} 
            hx-swap="outerHTML swap:0.3s"
            hx-confirm="Delete this task?"
            class="p-2 text-slate-300 dark:text-slate-700 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all opacity-0 group-hover:opacity-100">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
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
        <div class="relative group mb-10">
            <form hx-post="/todos" hx-target="#todo-list" hx-swap="afterbegin" hx-on::after-request="this.reset()" class="relative">
                <input type="text" name="content" placeholder="Type a new task..." required
                       class="w-full pl-6 pr-16 py-5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-600 transition-all text-lg placeholder-slate-400 dark:placeholder-slate-600">
                <button type="submit" class="absolute right-3 top-3 bottom-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">
                    Add
                </button>
            </form>
        </div>
        <ul id="todo-list" class="space-y-1">
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