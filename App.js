import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './src/AuthContext';
import { TaskProvider, useTasks } from './src/TaskContext';

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
  const { tasks, loading, createTask, toggleComplete } = useTasks();
  const [newTitle, setNewTitle] = useState('');

  async function add() {
    if (!newTitle.trim()) return;
    await createTask(newTitle.trim());
    setNewTitle('');
  }

  function renderItem({ item }) {
    let statusLabel = item.status;
    if (statusLabel === 'pending') statusLabel = 'Pendente';
    if (statusLabel === 'pending_approval') statusLabel = 'Aguardando Aprovação';
    if (statusLabel === 'completed') statusLabel = 'Concluída';

    return (
      <TouchableOpacity onPress={() => toggleComplete(item)} style={styles.task}>
        <Text style={styles.taskTitle}>{item.title}</Text>
        <Text style={styles.status}>{statusLabel}</Text>
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
        <Button title="Adicionar" onPress={add} />
      </View>
      {loading && <ActivityIndicator style={{marginTop:20}} />}
      <FlatList data={tasks} keyExtractor={i=>i.id} renderItem={renderItem} style={{width:'100%'}} contentContainerStyle={{gap:8}} />
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
      <TaskProvider>
        <Gate />
      </TaskProvider>
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
  status: { fontSize:12, marginTop:4, color:'#555' }
});
