import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore, collection, getDocs, query, where, limit } from 'firebase/firestore'

const config = {
  projectId: 'sancity-mall-ke',
  appId: '1:176769477465:web:9ad822538cf350f882fa48',
  apiKey: 'AIzaSyBs4dmOpKFcwxvOPhk5vXCFXUBaOeTJtOk',
  authDomain: 'sancity-mall-ke.firebaseapp.com',
}
const app = getApps().some(item => item.name === '[DEFAULT]') ? getApp() : initializeApp(config)
const db = getFirestore(app)

export async function fetchFirebaseProducts() {
  const snapshot = await getDocs(query(collection(db, 'products'), where('status', '==', 'published'), limit(1200)))
  if (snapshot.size === 1200) throw new Error('Catalogue has reached query limit; use pagination before publishing more products')
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a,b) => String(b.created_at||'').localeCompare(String(a.created_at||'')))
}
