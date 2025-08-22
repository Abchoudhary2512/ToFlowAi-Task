"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Profile = {
  id: string;
  name: string;
};

type Label = {
  id: string;
  name: string;
  created_at: string;
};

type Todo = {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean;
  assignee_id: string;
  assignee?: Profile; // joined
  labels?: Label[]; // joined labels
};

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [newLabelName, setNewLabelName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterUserId, setFilterUserId] = useState<string>("");
  const [filterLabelIds, setFilterLabelIds] = useState<string[]>([]);
  const [isLabelDropdownOpen, setIsLabelDropdownOpen] = useState(false);
  const [isFilterLabelDropdownOpen, setIsFilterLabelDropdownOpen] = useState(false);

  useEffect(() => {
    fetchTodos(); // it will fetch all the todos from the supbase db(todos tables)
    fetchUsers(); // all the users from the profile table
    fetchLabels(); // all the labels from the labels table
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("profiles").select("id, name");
    if (error) {
      console.error("User fetch error:", error);
      return;
    }
    setUsers(data || []);
  };

  const fetchLabels = async () => {
    const { data, error } = await supabase
      .from("labels")
      .select("id, name, created_at")
      .order("name", { ascending: true });
    if (error) {
      console.error("Labels fetch error:", error);
      return;
    }
    setLabels(data || []);
  };

  const fetchTodos = async () => {
    const { data, error } = await supabase
      .from("todos")
      .select(
        `
        *, 
        assignee:profiles(id, name),
        labels:todo_labels(label_id, labels(id, name))
      `
      )
      .order("id", { ascending: false });
    if (error) {
      console.error("Fetch error:", error);
      return;
    }

    
    // Transform the data to flatten labels
    //here we get the reponse as nested and to get the required data we flatten it
    //(as we have the many-2-many relationship)
    const transformedTodos =
      data?.map((todo) => ({
        ...todo,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        labels: todo.labels?.map((tl: any) => tl.labels).filter(Boolean) || [],
      })) || [];

    setTodos(transformedTodos as Todo[]);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setAssigneeId("");
    setSelectedLabelIds([]);
    setNewLabelName("");
    setEditingId(null);
  };

  const createNewLabel = async (labelName: string): Promise<string | null> => {
    const trimmedName = labelName.trim();
    if (!trimmedName) return null;

    // Check if label already exists (case-insensitive)
    const existingLabel = labels.find(
      (label) => label.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existingLabel) {
      return existingLabel.id;
    }

    // Create new label
    const { data, error } = await supabase
      .from("labels")
      .insert([{ name: trimmedName }])
      .select()
      .single();

    if (error) {
      console.error("Error creating label:", error);
      alert("Failed to create new label: " + error.message);
      return null;
    }

    setLabels((prev) =>
      [...prev, data].sort((a, b) => a.name.localeCompare(b.name))
    );
    return data.id;
  };

  const handleAddNewLabel = async () => {
    const newLabelId = await createNewLabel(newLabelName);
    if (newLabelId) {
      setSelectedLabelIds((prev) => [...prev, newLabelId]);
      setNewLabelName("");
    }
  };

  //simple enter the label name and then hit enter , the label adds
  const handleNewLabelKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddNewLabel();
    }
  };

  const saveTodo = async () => {
    if (!title.trim()) {
      alert("Title is required");
      return;
    }

    if (!assigneeId) {
      alert("Assignee is required");
      return;
    }

    if (selectedLabelIds.length === 0) {
      alert("At least one label is required");
      return;
    }

    if (editingId) {
      // Update todo
      const { error: todoError } = await supabase
        .from("todos")
        .update({
          title,
          description,
          due_date: dueDate,
          assignee_id: assigneeId,
        })
        .eq("id", editingId)
        .select();

      if (todoError) {
        console.error("Update error:", todoError);
        alert(todoError.message);
        return;
      }

      // Delete existing todo_labels relationships
      await supabase.from("todo_labels").delete().eq("todo_id", editingId);

      // Insert new todo_labels relationships
      if (selectedLabelIds.length > 0) {
        const todoLabelsData = selectedLabelIds.map((labelId) => ({
          todo_id: editingId,
          label_id: labelId,
        }));

        const { error: labelsError } = await supabase
          .from("todo_labels")
          .insert(todoLabelsData);

        if (labelsError) {
          console.error("Labels update error:", labelsError);
        }
      }

      resetForm();
      fetchTodos(); // Refresh the list
    } else {
      // Create new todo
      const { data: todoData, error: todoError } = await supabase
        .from("todos")
        .insert([
          {
            title,
            description,
            due_date: dueDate,
            assignee_id: assigneeId,
          },
        ])
        .select();

      if (todoError) {
        console.error("Insert error:", todoError);
        alert(todoError.message);
        return;
      }

      // Insert todo_labels relationships
      if (todoData && todoData[0] && selectedLabelIds.length > 0) {
        const todoLabelsData = selectedLabelIds.map((labelId) => ({
          todo_id: todoData[0].id,
          label_id: labelId,
        }));

        const { error: labelsError } = await supabase
          .from("todo_labels")
          .insert(todoLabelsData);

        if (labelsError) {
          console.error("Labels insert error:", labelsError);
        }
      }

      resetForm();
      fetchTodos(); // Refresh the list
    }
  };

  const toggleTodo = async (id: number, completed: boolean) => {
    const { data, error } = await supabase
      .from("todos")
      .update({ completed: !completed })
      .eq("id", id)
      .select("*, assignee:profiles(id, name)");
    if (error) {
      console.error("Toggle error:", error);
      return;
    }
    if (data) {
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t))
      );
    }
  };

  const editTodo = async (todo: Todo) => {
    setTitle(todo.title);
    setDescription(todo.description || "");
    setDueDate(todo.due_date || "");
    setAssigneeId(todo.assignee_id || "");

    // Fetch current labels for this todo
    const { data: todoLabels, error } = await supabase
      .from("todo_labels")
      .select("label_id")
      .eq("todo_id", todo.id);

    if (!error && todoLabels) {
      setSelectedLabelIds(todoLabels.map((tl) => tl.label_id));
    }

    setEditingId(todo.id);
  };

  const deleteTodo = async (id: number) => {
    // Delete todo_labels relationships first
    await supabase.from("todo_labels").delete().eq("todo_id", id);

    // Delete the todo
    const { error } = await supabase.from("todos").delete().eq("id", id);
    if (error) {
      console.error("Delete error:", error);
      return;
    }
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLabelToggle = (labelId: string) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId]
    );
  };

  const handleFilterLabelToggle = (labelId: string) => {
    setFilterLabelIds((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId]
    );
  };

  const clearAllFilters = () => {
    setFilterUserId("");
    setFilterLabelIds([]);
  };

  const assignedIds = todos
    .filter((t) => !editingId || t.id !== editingId)
    .map((t) => t.assignee_id);

  const availableUsers = users.filter(
    (u) => !assignedIds.includes(u.id) || u.id === assigneeId
  );

  const filteredTodos = todos.filter((todo) => {
    // Filter by assignee
    const matchesAssignee = !filterUserId || todo.assignee_id === filterUserId;

    // Filter by labels 
    const matchesLabels =
      filterLabelIds.length === 0 ||
      filterLabelIds.every((filterLabelId) =>
        todo.labels?.some((label) => label.id === filterLabelId)
      );

    return matchesAssignee && matchesLabels;
  });

  return (
    <div className="max-w-xl mx-auto space-y-6 mt-8">
      {/* Form */}
      <Card className="p-4 space-y-3">
        <h2 className="text-lg font-semibold">
          {editingId ? "✏️ Edit Todo" : "➕ Add Todo"}
        </h2>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
        />
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
        />
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        {/* Assignee Dropdown */}
        <Select
          value={assigneeId || undefined}
          onValueChange={(val) => setAssigneeId(val)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Assignee" />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Labels Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Labels: <span className="text-red-500">*</span>
          </label>

          {/* Add New Label Input */}
          <div className="flex gap-2">
            <Input
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              onKeyPress={handleNewLabelKeyPress}
              placeholder="Type new label name..."
              className="flex-1"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddNewLabel}
              disabled={!newLabelName.trim()}
            >
              Add Label
            </Button>
          </div>

          {/* Labels Dropdown */}
          <div className="relative">
            <button
              type="button"
              className={`flex w-full justify-between items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                selectedLabelIds.length === 0
                  ? "border-red-300 bg-red-50"
                  : "border-gray-200"
              }`}
              onClick={() => setIsLabelDropdownOpen(!isLabelDropdownOpen)}
            >
              <span className="truncate">
                {selectedLabelIds.length > 0
                  ? `${selectedLabelIds.length} label(s) selected`
                  : "Select labels"}
              </span>
              <span>▼</span>
            </button>

            {isLabelDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2 space-y-1">
                  {labels.length === 0 ? (
                    <p className="text-sm text-gray-500 p-2">
                      No labels available. Create one above!
                    </p>
                  ) : (
                    labels.map((label) => (
                      <label
                        key={label.id}
                        className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-100 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedLabelIds.includes(label.id)}
                          onChange={() => handleLabelToggle(label.id)}
                          className="rounded"
                        />
                        <span className="text-sm">{label.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Validation Message */}
          {selectedLabelIds.length === 0 && (
            <p className="text-sm text-red-500">
              ⚠️ Please select at least one label
            </p>
          )}

          {/* Selected Labels Display */}
          {selectedLabelIds.length > 0 && (
            <div className="space-y-1">
              <span className="text-sm text-gray-600">Selected labels:</span>
              <div className="flex flex-wrap gap-1">
                {selectedLabelIds.map((labelId) => {
                  const label = labels.find((l) => l.id === labelId);
                  return label ? (
                    <span
                      key={labelId}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center gap-1"
                    >
                      {label.name}
                      <button
                        type="button"
                        onClick={() => handleLabelToggle(labelId)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                        title="Remove label"
                      >
                        ×
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            onClick={saveTodo}
            disabled={selectedLabelIds.length === 0}
          >
            {editingId ? "Update" : "Add"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </Card>

      {/* Filter Section */}
      <Card className="p-4 space-y-3">
        <h3 className="text-md font-semibold">🔍 Filters</h3>

        {/* Assignee Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 min-w-[120px]">
            Filter by Assignee:
          </label>
          <Select
            value={filterUserId || "all"}
            onValueChange={(val) => setFilterUserId(val === "all" ? "" : val)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Assignees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Label Filter */}
        <div className="space-y-2">
          <label className="text-sm text-gray-600">Filter by Labels :</label>
          
          {/* Filter Labels Dropdown */}
          <div className="relative">
            <button
              type="button"
              className="flex w-full justify-between items-center rounded-md border border-gray-200 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              onClick={() => setIsFilterLabelDropdownOpen(!isFilterLabelDropdownOpen)}
            >
              <span className="truncate">
                {filterLabelIds.length > 0
                  ? `${filterLabelIds.length} label(s) selected`
                  : "Select labels to filter"}
              </span>
              <span>▼</span>
            </button>

            {isFilterLabelDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2 space-y-1">
                  {labels.length === 0 ? (
                    <p className="text-sm text-gray-500 p-2">No labels available</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {labels.map((label) => (
                        <label
                          key={label.id}
                          className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-100 rounded text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={filterLabelIds.includes(label.id)}
                            onChange={() => handleFilterLabelToggle(label.id)}
                            className="rounded"
                          />
                          <span className="truncate">{label.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Active Label Filters Display */}
          {filterLabelIds.length > 0 && (
            <div className="space-y-1">
              <span className="text-sm text-gray-600">
                Active label filters (must have ALL):
              </span>
              <div className="flex flex-wrap gap-1">
                {filterLabelIds.map((labelId) => {
                  const label = labels.find((l) => l.id === labelId);
                  return label ? (
                    <span
                      key={labelId}
                      className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center gap-1"
                    >
                      {label.name}
                      <button
                        type="button"
                        onClick={() => handleFilterLabelToggle(labelId)}
                        className="ml-1 text-green-600 hover:text-green-800"
                        title="Remove filter"
                      >
                        ×
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>

        {/* Filter Summary and Clear Button */}
        {(filterUserId || filterLabelIds.length > 0) && (
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Active Filters: </span>
              {filterUserId && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-1">
                  Assignee: {users.find((u) => u.id === filterUserId)?.name}
                </span>
              )}
              {filterLabelIds.length > 0 && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                  {filterLabelIds.length} Label
                  {filterLabelIds.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={clearAllFilters}
              className="text-xs"
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </Card>

      {/* Results Summary */}
      {(filterUserId || filterLabelIds.length > 0) && (
        <div className="text-sm text-gray-600 text-center p-2 bg-gray-50 rounded-md">
          Showing {filteredTodos.length} todo
          {filteredTodos.length !== 1 ? "s" : ""}
          {filterUserId &&
            ` assigned to ${users.find((u) => u.id === filterUserId)?.name}`}
          {filterLabelIds.length > 0 &&
            ` with ALL labels: ${filterLabelIds
              .map((id) => labels.find((l) => l.id === id)?.name)
              .join(", ")}`}
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {filteredTodos.map((todo) => (
          <Card key={todo.id} className="p-3">
            <CardContent className="p-0 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id, todo.completed)}
                  />
                  <span
                    className={
                      todo.completed ? "line-through text-gray-500" : ""
                    }
                  >
                    {todo.title}
                  </span>
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => editTodo(todo)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteTodo(todo.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              {todo.description && (
                <p className="text-sm text-gray-600">{todo.description}</p>
              )}
              {todo.due_date && (
                <p className="text-xs text-gray-500">
                  📅 Due: {new Date(todo.due_date).toLocaleDateString()}
                </p>
              )}
              {todo.assignee && (
                <p className="text-xs text-gray-500">
                  🙎‍♂️ Assigned to: {todo.assignee.name}
                </p>
              )}
              {todo.labels && todo.labels.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="text-xs text-gray-500">🏷️ Labels:</span>
                  {todo.labels.map((label) => (
                    <span
                      key={label.id}
                      className={`px-2 py-1 rounded-full text-xs ${
                        filterLabelIds.includes(label.id)
                          ? "bg-green-200 text-green-800 font-medium"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {filteredTodos.length === 0 && (
          <p className="text-center text-sm text-gray-500">
            {filterUserId || filterLabelIds.length > 0
              ? "No todos match the current filters."
              : "No todos found."}
          </p>
        )}
      </div>
    </div>
  );
}