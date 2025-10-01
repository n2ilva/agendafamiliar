import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCategories } from '../context/CategoryContext';
import { useTasks } from '../context/TaskContext';

interface Props {
  selectedIds: string[]; // múltiplas categorias
  onChange: (ids: string[]) => void;
}

const defaultPalette = ['#6200ee','#03dac4','#f9a825','#2e7d32','#c62828','#1565c0','#ff6d00'];

export const CategoryBar = ({ selectedIds, onChange }: Props) => {
  const { categories, addCategory, deleteCategory } = useCategories();
  const { categoryCounts } = useTasks();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
    const [color, setColor] = useState(defaultPalette[0]);
    const iconOptions = ['home','work','school','event','favorite','shopping-cart','pets','build','alarm','star'];
    const [icon, setIcon] = useState<string>(iconOptions[0]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    await addCategory(name.trim(), color, icon);
    setName('');
    setColor(defaultPalette[0]);
      setIcon(iconOptions[0]);
    setShowModal(false);
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Pressable onPress={() => onChange([])} style={[styles.chip, selectedIds.length === 0 && styles.selected, { backgroundColor: '#999' }]}> 
          <Text style={styles.chipText}>Todas</Text>
        </Pressable>
        {categories.map(cat => {
          const active = selectedIds.includes(cat.id);
          const count = categoryCounts?.[cat.id] || 0;
          return (
          <Pressable
            key={cat.id}
            onPress={() => {
              if (active) {
                onChange(selectedIds.filter(id => id !== cat.id));
              } else {
                onChange([...selectedIds, cat.id]);
              }
            }}
            onLongPress={() => {
              Alert.alert('Excluir categoria', `Deseja realmente excluir "${cat.name}"?`, [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Excluir', style: 'destructive', onPress: () => deleteCategory(cat.id) }
              ]);
            }}
            style={[styles.chip, active && styles.selected, { backgroundColor: cat.color || '#ccc' }]}
          >
            {cat.icon && <MaterialIcons name={cat.icon as any} size={16} color="#fff" style={{marginRight:6}} />}
            <Text style={styles.chipText}>{cat.name}</Text>
            {typeof count === 'number' && count > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{count}</Text></View>
            )}
          </Pressable>
          );
        })}
        <Pressable onPress={() => setShowModal(true)} style={[styles.chip, styles.addChip]}> 
          <Text style={styles.addText}>+</Text>
        </Pressable>
      </ScrollView>
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nova Categoria</Text>
            <TextInput placeholder="Nome" value={name} onChangeText={setName} style={styles.input} />
            <Text style={styles.sectionLabel}>Cor</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {defaultPalette.map(p => (
                <Pressable key={p} onPress={() => setColor(p)} style={[styles.colorDot, { backgroundColor: p, borderWidth: color === p ? 3 : 1 }]} />
              ))}
            </ScrollView>
            <Text style={styles.sectionLabel}>Ícone</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {iconOptions.map(i => (
                <Pressable key={i} onPress={() => setIcon(i)} style={[styles.iconChoice, icon === i && styles.iconChoiceSelected]}>
                  <MaterialIcons name={i as any} size={20} color={icon === i ? '#1976d2' : '#444'} />
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowModal(false)} style={[styles.actionBtn,{backgroundColor:'#777'}]}>
                <Text style={styles.actionTxt}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={handleAdd} style={[styles.actionBtn,{backgroundColor:'#1976d2'}]}>
                <Text style={styles.actionTxt}>Salvar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  selected: { borderWidth: 2, borderColor: '#000' },
  chipText: { color: '#fff', fontWeight: '600' },
  addChip: { backgroundColor: '#424242' },
  addText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  modalBackdrop: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center' },
  modalCard: { width:'85%', backgroundColor:'#fff', borderRadius:12, padding:16 },
  modalTitle: { fontSize:18, fontWeight:'700', marginBottom:8 },
  input: { borderWidth:1, borderColor:'#ccc', borderRadius:6, padding:8 },
  colorDot: { width:34, height:34, borderRadius:17, marginRight:10, borderColor:'#333' },
  modalActions: { flexDirection:'row', justifyContent:'flex-end', gap:12, marginTop:14 },
  actionBtn: { paddingHorizontal:16, paddingVertical:10, borderRadius:6 },
  actionTxt: { color:'#fff', fontWeight:'600' },
  sectionLabel: { fontWeight:'600', marginTop:8, marginBottom:2, fontSize:13, color:'#333' },
  iconChoice: { width:36, height:36, borderRadius:10, marginRight:8, backgroundColor:'#eee', justifyContent:'center', alignItems:'center', borderWidth:1, borderColor:'#ccc' },
  iconChoiceSelected: { backgroundColor:'#e3f2fd', borderColor:'#1976d2', borderWidth:2 }
  ,badge:{
    backgroundColor:'rgba(0,0,0,0.25)',
    paddingHorizontal:6,
    marginLeft:6,
    borderRadius:10,
    minWidth:20,
    alignItems:'center'
  },
  badgeText:{
    color:'#fff',
    fontSize:11,
    fontWeight:'600'
  }
});

export default CategoryBar;
