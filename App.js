import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './src/AuthContext';
import { TaskProvider, useTasks } from './src/TaskContext';
import { CategoryProvider, useCategories } from './src/CategoryContext';

function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null); setLoading(true);
    try {
      if (isRegister) await signUp(email.trim(), password);
      else await signIn(email.trim(), password);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Agenda Familiar</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} autoCapitalize='none' />
      <TextInput placeholder="Senha" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button title={loading ? '...' : (isRegister ? 'Registrar' : 'Entrar')} onPress={submit} disabled={loading} />
      <TouchableOpacity onPress={() => setIsRegister(!isRegister)} style={{marginTop:12}}>
        <Text style={styles.link}>{isRegister ? 'Já tem conta? Entrar' : 'Não tem conta? Registrar'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function TaskListScreen() {
  const { user, profile, logout } = useAuth();
  const { tasks, loading, createTask, toggleComplete, loadMore, exhausted } = useTasks();
  const { categories, createCategory } = useCategories();
  const [newTitle, setNewTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newDue, setNewDue] = useState(''); // yyyy-mm-dd

  async function add() {
    if (!newTitle.trim()) return;
    let dueAt = null;
    if (newDue) {
      try { dueAt = new Date(newDue).getTime(); } catch(e) { dueAt = null; }
    }
    await createTask(newTitle.trim(), { categoryId: selectedCategory, dueAt });
    setNewTitle('');
    setNewDue('');
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    await createCategory(newCategoryName.trim(), '#'+Math.floor(Math.random()*16777215).toString(16).padStart(6,'0'));
    setNewCategoryName('');
  }

  function renderItem({ item }) {
    if (selectedCategory && item.categoryId !== selectedCategory) return null;
    let statusLabel = item.status;
    if (statusLabel === 'pending') statusLabel = 'Pendente';
    if (statusLabel === 'pending_approval') statusLabel = 'Aguardando Aprovação';
    if (statusLabel === 'completed') statusLabel = 'Concluída';
    const cat = categories.find(c=>c.id===item.categoryId);
    const dueStr = item.dueAt ? new Date(item.dueAt).toLocaleDateString() : '';
    return (
      <TouchableOpacity onPress={() => toggleComplete(item)} style={styles.task}>
        <View style={{flexDirection:'row', justifyContent:'space-between'}}>
          <Text style={styles.taskTitle}>{item.title}</Text>
          {cat && <View style={[styles.badge,{backgroundColor:cat.color}]}><Text style={styles.badgeText}>{cat.name}</Text></View>}
        </View>
        <Text style={styles.status}>{statusLabel}{dueStr? ' • '+dueStr:''}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{flexDirection:'row', justifyContent:'space-between', width:'100%'}}>
        <Text style={styles.subtitle}>Olá {user.email} ({profile?.role})</Text>
        <Button title="Sair" onPress={logout} />
      </View>
      <View style={styles.row}>    
        <TextInput placeholder="Nova tarefa" value={newTitle} onChangeText={setNewTitle} style={[styles.input,{flex:1}]} />
      </View>
      <View style={styles.row}>    
        <TextInput placeholder="Data (YYYY-MM-DD)" value={newDue} onChangeText={setNewDue} style={[styles.input,{flex:1}]} />
        <Button title="Adicionar" onPress={add} />
      </View>

      <View style={[styles.row,{flexWrap:'wrap'}]}>
        <TouchableOpacity onPress={()=>setSelectedCategory(null)} style={[styles.catChip, !selectedCategory && styles.catChipActive]}>
          <Text style={styles.catChipText}>Todas</Text>
        </TouchableOpacity>
        {categories.map(cat=> (
          <TouchableOpacity key={cat.id} onPress={()=>setSelectedCategory(cat.id)} style={[styles.catChip, selectedCategory===cat.id && styles.catChipActive, {borderColor:cat.color}]}> 
            <Text style={[styles.catChipText,{color: cat.color}]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.row}>
        <TextInput placeholder="Nova categoria" value={newCategoryName} onChangeText={setNewCategoryName} style={[styles.input,{flex:1}]} />
        <Button title="Criar" onPress={addCategory} />
      </View>
      {loading && <ActivityIndicator style={{marginTop:20}} />}
      <FlatList data={tasks} keyExtractor={i=>i.id} renderItem={renderItem} style={{width:'100%'}} contentContainerStyle={{gap:8}} ListFooterComponent={!exhausted ? (
        <TouchableOpacity onPress={loadMore} style={styles.loadMore}><Text>Carregar mais...</Text></TouchableOpacity>
      ) : <Text style={{textAlign:'center', padding:12}}>Fim</Text>} />
    </View>
  );
}

function Gate() {
  const { user, loading } = useAuth();
  if (loading) return <View style={styles.container}><ActivityIndicator /></View>;
  if (!user) return <LoginScreen />;
  return <TaskListScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <CategoryProvider>
        <TaskProvider>
          <Gate />
        </TaskProvider>
      </CategoryProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, alignItems:'center', justifyContent:'flex-start', padding:24, gap:16 },
  title: { fontSize:28, fontWeight:'bold', marginBottom:8 },
  subtitle: { fontSize:16, fontWeight:'600' },
  input: { borderWidth:1, borderColor:'#ccc', padding:10, borderRadius:6 },
  link: { color:'#1e60d4' },
  error: { color:'red' },
  row: { flexDirection:'row', alignItems:'center', gap:8 },
  task: { padding:12, borderWidth:1, borderColor:'#ddd', borderRadius:8, width:'100%' },
  taskTitle: { fontSize:16, fontWeight:'500' },
  status: { fontSize:12, marginTop:4, color:'#555' },
  badge: { paddingHorizontal:8, paddingVertical:2, borderRadius:12 },
  badgeText: { fontSize:10, color:'#fff' },
  catChip: { borderWidth:1, borderColor:'#ccc', paddingHorizontal:10, paddingVertical:6, borderRadius:16, marginRight:8, marginBottom:8 },
  catChipActive: { backgroundColor:'#222' , borderColor:'#222' },
  catChipText: { fontSize:12 },
  loadMore: { padding:12, alignItems:'center' }
});
