import TodoList from "@/components/TodoList";

export default function Home() {
  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-center"> Todo App</h1>
      
      <TodoList />
    </main>
  );
}
