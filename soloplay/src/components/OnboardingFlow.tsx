import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, TextInput, KeyboardAvoidingView, Platform, LayoutAnimation, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme/theme';
import { useProfileStore } from '../store/useProfileStore';
import { getAgeGroup } from '../screens/DashboardScreen';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface FadeInOptionProps {
  delay: number;
  isVisible: boolean;
  children: React.ReactNode;
}

const FadeInOption: React.FC<FadeInOptionProps> = ({ delay, isVisible, children }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setIsMounted(true);
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true })
        ]).start();
      }, delay);
      return () => clearTimeout(timer);
    } else {
      setIsMounted(false);
      opacity.setValue(0);
      translateY.setValue(10);
    }
  }, [isVisible, delay]);

  if (!isMounted) return null;
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
};

interface OnboardingFlowProps {
  onNavigate: (screen: string) => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onNavigate }) => {
  const completeProfile = useProfileStore(state => state.completeProfile);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const totalQuestions = 6;

  const scrollViewRef = useRef<ScrollView>(null);
  const ageInputRef = useRef<TextInput>(null);
  
  const [userName, setUserName] = useState('');
  const [userAge, setUserAge] = useState('');
  const [userAvatar, setUserAvatar] = useState('');
  const [isAvatarManuallySet, setIsAvatarManuallySet] = useState(false);

  useEffect(() => {
    if (isAvatarManuallySet || !userName) return;
    
    const name = userName.toLowerCase().trim();
    const femaleNames = ['ayşe', 'fatma', 'zeynep', 'elif', 'merve', 'büşra', 'gizem', 'esra', 'eda', 'seda', 'selin', 'aylin', 'ceren', 'ceylan'];
    const maleNames = ['ali', 'ahmet', 'mehmet', 'mustafa', 'can', 'cem', 'mert', 'burak', 'emre', 'serdar', 'hakan', 'volkan', 'gökhan', 'murat'];
    
    if (femaleNames.some(f => name.includes(f)) || name.endsWith('a') || name.endsWith('e') || name.endsWith('nur') || name.endsWith('gül')) {
      setUserAvatar('female');
    } else if (maleNames.some(m => name.includes(m))) {
      setUserAvatar('male');
    }
  }, [userName, isAvatarManuallySet]);
  
  const [q2Option, setQ2Option] = useState('');
  const [q2Custom, setQ2Custom] = useState('');
  
  const [q3Options, setQ3Options] = useState<string[]>([]);
  const [q3Custom, setQ3Custom] = useState('');
  
  const [q4Options, setQ4Options] = useState<string[]>([]);
  const [q4Custom, setQ4Custom] = useState('');
  
  const [q5Options, setQ5Options] = useState<string[]>([]);
  const [q5Custom, setQ5Custom] = useState('');

  const [displayedText, setDisplayedText] = useState('');
  const [isTypingFinished, setIsTypingFinished] = useState(false);
  const [questionY, setQuestionY] = useState(0);

  const getFullText = (step: number, name: string, ageStr: string) => {
    const age = parseInt(ageStr);
    const group = getAgeGroup(ageStr);

    if (step === 1) {
      return "Merhaba! Ben Soloplay Asistan; senin yeni yoldaşınım. Aramızdaki bu güzel yolculuğa başlamadan önce, sana uygun davranabilmem için ismini ve yaşını öğrenebilir miyim?";
    } else if (step === 2) {
      if (group === 'child') return `Harika, ${name}! Seni tanımak çok güzel. Demek ${age} yaşındasın. Peki, günlük hayatta hangisi seni daha çok anlatıyor?`;
      if (group === 'teen') return `Selam ${name}! ${age} yaşında olmak harika bir dönem. Genelde günlerin nasıl geçiyor, hangisi seni daha iyi özetler?`;
      if (group === 'adult') return `Memnun oldum ${name}. ${age} yaşındasınız. Hayat temponuzu ve genel modunuzu nasıl tanımlarsınız?`;
      if (group === 'senior') return `Hoş geldiniz ${name}. ${age} yaşındasınız, ne güzel. Günlük rutininizde kendinizi en çok hangi duruma yakın hissediyorsunuz?`;
    } else if (step === 3) {
      let q2text = getOptions(2, ageStr).find(o => o.id === q2Option)?.text || q2Custom;
      if (group === 'child') return `Demek "${q2text}" diyorsun... Seninle çok iyi anlaşacağımızı şimdiden hissediyorum! Peki, seni en çok ne heyecanlandırır? Hangi konulara ilgi duyarsın?`;
      if (group === 'teen') return `Demek "${q2text}" diyorsun... Seni çok iyi anlıyorum. Peki, son zamanlarda seni en çok zorlayan veya geliştirmek istediğin şey nedir?`;
      if (group === 'adult') return `Demek "${q2text}" diyorsunuz... Anlıyorum. Peki şu sıralar en çok hangi konularda zorluk yaşıyor veya destek arıyorsunuz?`;
      if (group === 'senior') return `Demek "${q2text}" diyorsunuz... Anlıyorum. Peki bugünlerde en çok eksikliğini hissettiğiniz veya zorlandığınız konu nedir?`;
    } else if (step === 4) {
      return `Bunu paylaştığın için teşekkürler. Benimle (AI Asistanınla) olan bu deneyimde en çok neyi başarmak istiyorsun?`;
    } else if (step === 5) {
      return `Harika! Tüm bunları not aldım. Son olarak, benden nasıl bir yaklaşım ve arkadaşlık bekliyorsun?`;
    } else if (step === 6) {
      return `Her şey tamam ${name}! Seni tanıdığıma çok sevindim. Profili senin için hazırladım. Artık maceramıza başlamaya hazırız!`;
    }
    return "";
  };

  const getOptions = (step: number, ageStr: string) => {
    const group = getAgeGroup(ageStr);
    if (step === 2) {
      if (group === 'child') return [
        { id: '1', text: 'Çok hareketliyim, sürekli koşup oynarım' },
        { id: '2', text: 'Daha sakin ve sessizim, kendi halimde takılırım' },
        { id: '3', text: 'Çok konuşkanım, arkadaşlarımla olmayı severim' },
        { id: '4', text: 'Hep yeni şeyler keşfetmek isterim, çok meraklıyım' }
      ];
      if (group === 'teen') return [
        { id: '1', text: 'Sınavlar ve okul koşturmacası' },
        { id: '2', text: 'Sosyalleşerek ve arkadaşlarımla' },
        { id: '3', text: 'Hobilerime ve kendime odaklanarak' },
        { id: '4', text: 'Sürekli hareketli ve tempolu' }
      ];
      if (group === 'adult') return [
        { id: '1', text: 'Çok yoğun ve sürekli koşturmacalı' },
        { id: '2', text: 'Daha sakin, masa başı ve odaklı' },
        { id: '3', text: 'Sürekli yollarda, hareket halinde' },
        { id: '4', text: 'Belli bir rutin içinde, planlı' }
      ];
      if (group === 'senior') return [
        { id: '1', text: 'Sakin ve huzurlu bir rutinde' },
        { id: '2', text: 'Torunlar veya ailemle vakit geçirerek' },
        { id: '3', text: 'Bahçe veya yürüyüş gibi hafif aktiviteler' },
        { id: '4', text: 'Okuyarak veya yeni şeyler keşfederek' }
      ];
    } else if (step === 3) {
      if (group === 'child') return [
        { id: '1', text: 'Dijital oyunlar (Roblox, Minecraft vb.)' },
        { id: '2', text: 'Robotlar, Yapay Zeka ve bilim' },
        { id: '3', text: 'Çizgi filmler, Animeler ve eğlenceli videolar' },
        { id: '4', text: 'Uzay, dinozorlar ve gizemler' }
      ];
      if (group === 'teen') return [
        { id: '1', text: 'Çabuk pes ediyorum / Motivasyonum düşüyor' },
        { id: '2', text: 'Öfkemi bazen kontrol edemiyorum' },
        { id: '3', text: 'Odaklanamıyorum / Çok vakit kaybediyorum' },
        { id: '4', text: 'Kendimi ifade etmekte zorlanıyorum' }
      ];
      if (group === 'adult') return [
        { id: '1', text: 'Zaman yönetimi yapamıyorum / Erteliyorum' },
        { id: '2', text: 'Strese çok çabuk yenik düşüyorum' },
        { id: '3', text: 'İstikrarsızım / Başladığım işi bitiremiyorum' },
        { id: '4', text: 'Hayır diyemiyorum / Başkalarını fazla önemsiyorum' }
      ];
      if (group === 'senior') return [
        { id: '1', text: 'Sık sık yalnızlık çekiyorum' },
        { id: '2', text: 'Unutkanlık veya odaklanma sorunu yaşıyorum' },
        { id: '3', text: 'Fiziksel olarak eskisi kadar enerjik hissetmiyorum' },
        { id: '4', text: 'Teknolojiye adapte olmakta zorlanıyorum' }
      ];
    } else if (step === 4) {
      if (group === 'child') return [
        { id: '1', text: 'Yeteneklerimi keşfetmek ve özgüven kazanmak' },
        { id: '2', text: 'Zamanımı planlamak ve sorumluluk bilmek' },
        { id: '3', text: 'Duygularımı daha iyi anlamak ve yönetmek' },
        { id: '4', text: 'Hayal gücümü genişletmek ve ufuk açmak' }
      ];
      if (group === 'teen') return [
        { id: '1', text: 'Ders ve sınav planlaması' },
        { id: '2', text: 'Kişisel gelişim ve tavsiyeler' },
        { id: '3', text: 'Eğlenceli ve samimi sohbet' },
        { id: '4', text: 'Günlük hedeflerimi takip et' }
      ];
      if (group === 'adult') return [
        { id: '1', text: 'İş ve zaman yönetimi' },
        { id: '2', text: 'Kariyer ve kişisel gelişim' },
        { id: '3', text: 'Stres yönetimi ve hatırlatıcılar' },
        { id: '4', text: 'Sadece dertleşmek ve sohbet' }
      ];
      if (group === 'senior') return [
        { id: '1', text: 'İlaç ve günlük rutin hatırlatıcıları' },
        { id: '2', text: 'Sohbet edip anılarımı dinlemen' },
        { id: '3', text: 'Teknoloji kullanımında bana yardımcı olman' },
        { id: '4', text: 'Güncel haberler ve bilgiler vermen' }
      ];
    } else if (step === 5) {
      if (group === 'child') return [
        { id: '1', text: 'Seni her zaman dinleyip hep yüzünü güldürmek!' },
        { id: '2', text: 'Zorluklarla karşılaştığında hep yanında olmak!' },
        { id: '3', text: 'Sana her gün yeni ve harika şeyler öğretmek!' },
        { id: '4', text: 'Hayallerine ulaşman için sana her zaman inanmak!' }
      ];
      if (group === 'teen') return [
        { id: '1', text: 'Sınırları zorla ve her gün daha iyi ol!' },
        { id: '2', text: 'Stres yok, sadece anı yaşa ve eğlen!' },
        { id: '3', text: 'Yenilikleri keşfet ve kendi yolunu çiz!' },
        { id: '4', text: 'Birlikten kuvvet doğar, gücümüzü birleştirelim!' }
      ];
      if (group === 'adult') return [
        { id: '1', text: 'Maksimum verim, kusursuz zaman yönetimi!' },
        { id: '2', text: 'Dengeli yaşam, iç huzur ve sağlık.' },
        { id: '3', text: 'Sürekli gelişim ve kariyer hedefleri.' },
        { id: '4', text: 'Sadece keyifli anlar ve stresten uzak bir liman.' }
      ];
      if (group === 'senior') return [
        { id: '1', text: 'Eski güzel günlerden ve tatlı anılardan konuşmayı.' },
        { id: '2', text: 'Sakin, huzurlu ve sağlığa odaklı bir yaklaşımı.' },
        { id: '3', text: 'Yeni dünyayı ve güncel olayları keşfetmeyi.' },
        { id: '4', text: 'Ailevi değerler ve derin, içten sohbetleri.' }
      ];
    }
    return [];
  };

  useEffect(() => {
    let currentIndex = 0;
    setDisplayedText('');
    setIsTypingFinished(false);
    
    if (questionY > 0) {
      scrollViewRef.current?.scrollTo({ y: questionY - 20, animated: true });
    }

    const fullText = getFullText(currentQuestion, userName, userAge);

    const interval = setInterval(() => {
      if (currentIndex < fullText.length - 1) {
        setDisplayedText(prev => prev + fullText[currentIndex]);
        currentIndex++;
      } else {
        setDisplayedText(fullText);
        setIsTypingFinished(true);
        clearInterval(interval);
      }
    }, 15);

    return () => clearInterval(interval);
  }, [currentQuestion]);

  const toggleMultiOption = (id: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => {
      if (prev.includes(id)) return prev.filter(item => item !== id);
      return [...prev, id];
    });
  };

  const handleBack = () => {
    if (currentQuestion > 1) {
      if (Platform.OS === 'ios' || UIManager.setLayoutAnimationEnabledExperimental) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion === 1) {
      if (!userName.trim() && !userAge.trim() && !userAvatar) { Alert.alert("Eksik Bilgi", "Lütfen isminizi, yaşınızı ve avatarınızı belirleyin."); return; }
      if (!userName.trim()) { Alert.alert("Eksik Bilgi", "Lütfen adınızı girin."); return; }
      if (!userAge.trim()) { Alert.alert("Eksik Bilgi", "Lütfen yaşınızı girin."); return; }
      if (!userAvatar) { Alert.alert("Eksik Bilgi", "Lütfen bir avatar seçin."); return; }
      if (isNaN(parseInt(userAge))) { Alert.alert("Hatalı Yaş", "Lütfen yaşınızı rakamla girin."); return; }
    } else if (currentQuestion === 2) {
      if (!q2Option && !q2Custom.trim()) { Alert.alert("Seçim Yapmadınız", "Lütfen bir seçenek belirleyin."); return; }
    } else if (currentQuestion === 3) {
      if (q3Options.length === 0 && !q3Custom.trim()) { Alert.alert("Seçim Yapmadınız", "Lütfen en az bir seçenek belirleyin."); return; }
    } else if (currentQuestion === 4) {
      if (q4Options.length === 0 && !q4Custom.trim()) { Alert.alert("Seçim Yapmadınız", "Lütfen en az bir seçenek belirleyin."); return; }
    } else if (currentQuestion === 5) {
      if (q5Options.length === 0 && !q5Custom.trim()) { Alert.alert("Seçim Yapmadınız", "Lütfen bir seçenek belirleyin."); return; }
    } else if (currentQuestion === 6) {
      const group = getAgeGroup(userAge);
      let reportStrengths = "Belirtilmedi.";
      let reportImprovements = "Belirtilmedi.";
      let aiComment = "Sizi tanıdıkça hedeflerimiz şekillenecek.";
      
      if (group === 'child') {
        reportStrengths = q3Custom.trim() ? `${q3Custom.trim()} alanına ilgili, meraklı` : `${q3Options.length} farklı alana ilgili, meraklı`;
      } else {
        reportImprovements = q3Custom.trim() ? `${q3Custom.trim()} konusunda gelişim istiyor` : `Zorlandığı ${q3Options.length} alanda destek istiyor`;
      }
      
      completeProfile(userName, userAge, reportStrengths, reportImprovements, aiComment);
      onNavigate('Dashboard');
      return;
    }
    
    if (Platform.OS === 'ios' || UIManager.setLayoutAnimationEnabledExperimental) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setCurrentQuestion(prev => prev + 1);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollContainer} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View 
          style={styles.aiQuestionBox} 
          onLayout={(e) => setQuestionY(e.nativeEvent.layout.y)}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={[styles.aiHeaderRow, { marginBottom: 0 }]}>
              <Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
              <Text style={styles.aiHeaderTitle}>AI Tanışma Süreci ({currentQuestion < 6 ? currentQuestion : 5}/5)</Text>
            </View>
            {currentQuestion > 1 && currentQuestion < 6 && (
               <TouchableOpacity onPress={handleBack} style={{ flexDirection: 'row', alignItems: 'center' }}>
                 <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
                 <Text style={{ color: colors.textSecondary, marginLeft: 4, fontSize: 14 }}>Geri</Text>
               </TouchableOpacity>
            )}
          </View>
          <Text style={styles.aiQuestionText}>{displayedText}</Text>
        </View>

        {currentQuestion === 1 && (
          <View style={styles.optionsContainer}>
            <FadeInOption isVisible={isTypingFinished} delay={100}>
              <View style={[styles.inputContainer, { borderColor: userName.trim() ? colors.primary : colors.border }]}>
                <Ionicons name="person-outline" size={20} color={userName.trim() ? colors.primary : colors.textSecondary} style={{ marginRight: 12 }} />
                <TextInput 
                  style={styles.textInput}
                  placeholder="İsminiz (Örn: Serdar, Ayşe)"
                  placeholderTextColor={colors.textSecondary}
                  value={userName}
                  onChangeText={setUserName}
                  returnKeyType="next"
                  onSubmitEditing={() => ageInputRef.current?.focus()}
                  blurOnSubmit={false}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: questionY + 80, animated: true });
                    }, 150);
                  }}
                />
              </View>
            </FadeInOption>

            <FadeInOption isVisible={isTypingFinished} delay={300}>
              <View style={[styles.inputContainer, { marginTop: 16, borderColor: userAge.trim() ? colors.primary : colors.border }]}>
                <Ionicons name="calendar-outline" size={20} color={userAge.trim() ? colors.primary : colors.textSecondary} style={{ marginRight: 12 }} />
                <TextInput 
                  ref={ageInputRef}
                  style={styles.textInput}
                  placeholder="Yaşınız (Örn: 25)"
                  placeholderTextColor={colors.textSecondary}
                  value={userAge}
                  onChangeText={setUserAge}
                  keyboardType="number-pad"
                  maxLength={3}
                  returnKeyType="done"
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: questionY + 160, animated: true });
                    }, 150);
                  }}
                />
              </View>
            </FadeInOption>

            <FadeInOption isVisible={isTypingFinished} delay={500}>
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 16 }}>
                <TouchableOpacity 
                  style={[styles.optionButton, { flex: 1, alignItems: 'center', marginBottom: 0 }, userAvatar === 'male' && styles.optionButtonActive]}
                  onPress={() => { setUserAvatar('male'); setIsAvatarManuallySet(true); }}
                >
                  <Ionicons name="man" size={24} color={userAvatar === 'male' ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.optionText, userAvatar === 'male' && styles.optionTextActive, { marginTop: 8 }]}>Erkek</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.optionButton, { flex: 1, alignItems: 'center', marginBottom: 0 }, userAvatar === 'female' && styles.optionButtonActive]}
                  onPress={() => { setUserAvatar('female'); setIsAvatarManuallySet(true); }}
                >
                  <Ionicons name="woman" size={24} color={userAvatar === 'female' ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.optionText, userAvatar === 'female' && styles.optionTextActive, { marginTop: 8 }]}>Kadın</Text>
                </TouchableOpacity>
              </View>
            </FadeInOption>
          </View>
        )}

        {currentQuestion === 2 && (
          <View style={styles.optionsContainer}>
            {getOptions(2, userAge).map((opt, index) => {
              const isSelected = q2Option === opt.id;
              return (
                <FadeInOption key={opt.id} isVisible={isTypingFinished} delay={100 + (index * 150)}>
                  <TouchableOpacity 
                    style={[styles.optionButton, isSelected && styles.optionButtonActive]}
                    onPress={() => setQ2Option(opt.id)}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>{opt.text}</Text>
                  </TouchableOpacity>
                </FadeInOption>
              );
            })}
            <FadeInOption isVisible={isTypingFinished} delay={700}>
              <View style={[styles.inputContainer, { marginTop: 8, borderColor: q2Custom.trim() ? colors.primary : colors.border }]}>
                <Ionicons name="create-outline" size={20} color={q2Custom.trim() ? colors.primary : colors.textSecondary} style={{ marginRight: 12 }} />
                <TextInput 
                  style={styles.textInput}
                  placeholder="Veya farklı bir durum yazın..."
                  placeholderTextColor={colors.textSecondary}
                  value={q2Custom}
                  onChangeText={(val) => { setQ2Custom(val); if(val) setQ2Option(''); }}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 150);
                  }}
                />
              </View>
            </FadeInOption>
          </View>
        )}

        {currentQuestion === 3 && (
          <View style={styles.optionsContainer}>
            <Text style={{ color: colors.primary, fontSize: 13, marginBottom: 10, textAlign: 'center', opacity: 0.8 }}>
              *(Birden fazla seçim yapabilirsiniz)*
            </Text>
            {getOptions(3, userAge).map((opt, index) => {
              const isSelected = q3Options.includes(opt.id);
              return (
                <FadeInOption key={opt.id} isVisible={isTypingFinished} delay={100 + (index * 150)}>
                  <TouchableOpacity 
                    style={[styles.optionButton, isSelected && styles.optionButtonActive]}
                    onPress={() => toggleMultiOption(opt.id, setQ3Options)}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>{opt.text}</Text>
                  </TouchableOpacity>
                </FadeInOption>
              );
            })}
            <FadeInOption isVisible={isTypingFinished} delay={700}>
              <View style={[styles.inputContainer, { marginTop: 8, borderColor: q3Custom.trim() ? colors.primary : colors.border }]}>
                <Ionicons name="create-outline" size={20} color={q3Custom.trim() ? colors.primary : colors.textSecondary} style={{ marginRight: 12 }} />
                <TextInput 
                  style={styles.textInput}
                  placeholder={getAgeGroup(userAge) === 'child' ? "Veya farklı bir ilgi alanınızı yazın..." : "Veya farklı bir zorluğunuzu yazın..."}
                  placeholderTextColor={colors.textSecondary}
                  value={q3Custom}
                  onChangeText={setQ3Custom}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 150);
                  }}
                />
              </View>
            </FadeInOption>
          </View>
        )}

        {currentQuestion === 4 && (
          <View style={styles.optionsContainer}>
            <Text style={{ color: colors.primary, fontSize: 13, marginBottom: 10, textAlign: 'center', opacity: 0.8 }}>
              *(Birden fazla seçim yapabilirsiniz)*
            </Text>
            {getOptions(4, userAge).map((opt, index) => {
              const isSelected = q4Options.includes(opt.id);
              return (
                <FadeInOption key={opt.id} isVisible={isTypingFinished} delay={100 + (index * 150)}>
                  <TouchableOpacity 
                    style={[styles.optionButton, isSelected && styles.optionButtonActive]}
                    onPress={() => toggleMultiOption(opt.id, setQ4Options)}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>{opt.text}</Text>
                  </TouchableOpacity>
                </FadeInOption>
              );
            })}
            <FadeInOption isVisible={isTypingFinished} delay={700}>
              <View style={[styles.inputContainer, { marginTop: 8, borderColor: q4Custom.trim() ? colors.primary : colors.border }]}>
                <Ionicons name="create-outline" size={20} color={q4Custom.trim() ? colors.primary : colors.textSecondary} style={{ marginRight: 12 }} />
                <TextInput 
                  style={styles.textInput}
                  placeholder="Farklı bir hedefiniz varsa yazın..."
                  placeholderTextColor={colors.textSecondary}
                  value={q4Custom}
                  onChangeText={setQ4Custom}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 150);
                  }}
                />
              </View>
            </FadeInOption>
          </View>
        )}

        {currentQuestion === 5 && (
          <View style={styles.optionsContainer}>
            <Text style={{ color: colors.primary, fontSize: 13, marginBottom: 10, textAlign: 'center', opacity: 0.8 }}>
              *(Birden fazla seçim yapabilirsiniz)*
            </Text>
            {getOptions(5, userAge).map((opt, index) => {
              const isSelected = q5Options.includes(opt.id);
              return (
                <FadeInOption key={opt.id} isVisible={isTypingFinished} delay={100 + (index * 150)}>
                  <TouchableOpacity 
                    style={[styles.optionButton, isSelected && styles.optionButtonActive]}
                    onPress={() => toggleMultiOption(opt.id, setQ5Options)}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>{opt.text}</Text>
                  </TouchableOpacity>
                </FadeInOption>
              );
            })}
            <FadeInOption isVisible={isTypingFinished} delay={700}>
              <View style={[styles.inputContainer, { marginTop: 8, borderColor: q5Custom.trim() ? colors.primary : colors.border }]}>
                <Ionicons name="create-outline" size={20} color={q5Custom.trim() ? colors.primary : colors.textSecondary} style={{ marginRight: 12 }} />
                <TextInput 
                  style={styles.textInput}
                  placeholder="Kendi yaklaşımınızı yazın..."
                  placeholderTextColor={colors.textSecondary}
                  value={q5Custom}
                  onChangeText={setQ5Custom}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 150);
                  }}
                />
              </View>
            </FadeInOption>
          </View>
        )}

        <FadeInOption isVisible={isTypingFinished} delay={500}>
          <TouchableOpacity 
            style={styles.nextButton}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {currentQuestion === totalQuestions ? "Maceraya Başla!" : "Cevapla & İlerle"}
            </Text>
            <Ionicons name="arrow-forward" size={20} color={colors.background} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </FadeInOption>
        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  aiQuestionBox: {
    backgroundColor: 'rgba(0, 255, 157, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 157, 0.2)',
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiHeaderTitle: {
    ...typography.title,
    color: colors.primary,
    marginLeft: 8,
    fontSize: 16,
  },
  aiQuestionText: {
    ...typography.body,
    fontSize: 18,
    lineHeight: 26,
    color: colors.text,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionButton: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  optionButtonActive: {
    backgroundColor: 'rgba(0, 255, 157, 0.1)',
    borderColor: colors.primary,
  },
  optionText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 15,
  },
  optionTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    fontSize: 16,
  },
  nextButton: {
    backgroundColor: colors.primary,
    borderRadius: 30,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  nextButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
