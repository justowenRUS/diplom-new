import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking } from 'react-native';
import { useTheme } from '../ThemeContext';
import { parse, HTMLElement } from 'node-html-parser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface NewsItem {
  date: string;
  title: string;
  description: string;
  imageUrl: string;
  link: string;
}

export default function MainScreen() {
  const { isDarkMode } = useTheme();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [error, setError] = useState<string>('');

  // Функция для загрузки новостей с сервера
  const fetchNewsFromServer = async () => {
    try {
      console.log('1. Запрос списка новостей...');
      const response = await fetch('http://192.168.1.118:3000/news');
      const html = await response.text();
      const root = parse(html);
      const newsSlider = root.querySelector('.app-news-tab-list-box-slider');
      if (!newsSlider) {
        throw new Error('Блок .app-news-tab-list-box-slider не найден');
      }

      const newsItems = newsSlider.querySelectorAll('.app-news-tab-list-box-slider-slid');
      const initialNews = newsItems.map((item) => {
        const date = item.querySelector('span')?.textContent || 'Нет даты';
        const title = item.querySelector('h2')?.textContent || 'Без заголовка';
        const linkElement = item.querySelector('a.primary');
        const link = linkElement ? `https://spo-13.mskobr.ru${linkElement.getAttribute('href')}` : '';
        return { date, title, description: '', imageUrl: '', link };
      });

      const detailedNews = await Promise.all(
        initialNews.map(async (newsItem) => {
          if (!newsItem.link) return newsItem;
          console.log(`2. Запрос полной новости: ${newsItem.link}`);
          const detailResponse = await fetch(`http://192.168.1.118:3000/news?url=${encodeURIComponent(newsItem.link)}`);
          const detailHtml = await detailResponse.text();
          const detailRoot = parse(detailHtml);

          const head = detailRoot.querySelector('.kris-component-head h1');
          const title = head?.childNodes[0]?.textContent.trim() || newsItem.title;
          const rawDate = head?.querySelector('small')?.textContent || newsItem.date;
          let date = rawDate;
          try {
            const parsedDate = parseISO(rawDate);
            date = format(parsedDate, 'd MMMM yyyy', { locale: ru });
          } catch (e) {
            console.log(`Не удалось распарсить дату: ${rawDate}, оставляем как есть`);
          }
          const description = detailRoot.querySelector('.kris-redaktor-format p')?.textContent || 'Нет описания';
          const img = detailRoot.querySelector('.kris-redaktor-format img');
          const imageUrl = img ? `https://spo-13.mskobr.ru${img.getAttribute('src')}` : '';

          return { date, title, description, imageUrl, link: newsItem.link };
        })
      );

      return detailedNews.length > 0 ? detailedNews : [{ date: '', title: 'Новостей нет', description: '', imageUrl: '', link: '' }];
    } catch (error) {
      console.error('Ошибка загрузки новостей с сервера:', error);
      throw error;
    }
  };

  // Функция для сохранения новостей в кэш
  const saveNewsToCache = async (newsData: NewsItem[]) => {
    try {
      await AsyncStorage.setItem('cachedNews', JSON.stringify(newsData));
      console.log('Новости сохранены в кэш');
    } catch (error) {
      console.error('Ошибка сохранения новостей в кэш:', error);
    }
  };

  // Функция для загрузки новостей из кэша
  const loadNewsFromCache = async () => {
    try {
      const cachedNews = await AsyncStorage.getItem('cachedNews');
      if (cachedNews) {
        const parsedNews = JSON.parse(cachedNews);
        console.log('Новости загружены из кэша:', parsedNews);
        return parsedNews;
      }
      return null;
    } catch (error) {
      console.error('Ошибка загрузки новостей из кэша:', error);
      return null;
    }
  };

  // Функция для проверки обновлений
  const checkForUpdates = async (cachedNews: NewsItem[]) => {
    try {
      const serverNews = await fetchNewsFromServer();
      // Проверяем, есть ли новые новости
      // Для простоты сравниваем количество новостей и дату первой новости
      const hasUpdates =
        serverNews.length !== cachedNews.length ||
        (serverNews[0] && cachedNews[0] && serverNews[0].date !== cachedNews[0].date);

      if (hasUpdates) {
        console.log('Обнаружены новые новости, обновляем кэш и UI');
        await saveNewsToCache(serverNews);
        setNews(serverNews);
      } else {
        console.log('Новых новостей нет');
      }
    } catch (error) {
      console.error('Ошибка проверки обновлений:', error);
      setError('Ошибка проверки обновлений: ' + error.message);
    }
  };

  useEffect(() => {
    const initializeNews = async () => {
      // Сначала пытаемся загрузить новости из кэша
      const cachedNews = await loadNewsFromCache();
      if (cachedNews) {
        setNews(cachedNews);
      } else {
        // Если кэша нет, загружаем с сервера
        try {
          const serverNews = await fetchNewsFromServer();
          setNews(serverNews);
          await saveNewsToCache(serverNews);
        } catch (error) {
          setError('Ошибка загрузки данных: ' + error.message);
          setNews([{ date: '', title: 'Ошибка загрузки данных', description: '', imageUrl: '', link: '' }]);
        }
      }

      // Проверяем обновления в любом случае
      if (cachedNews) {
        await checkForUpdates(cachedNews);
      }
    };

    initializeNews();
  }, []);

  const handlePress = (link: string) => {
    if (link) {
      Linking.openURL(link).catch((err) => console.error('Ошибка открытия ссылки:', err));
    }
  };

  return (
    <View style={dynamicStyles(isDarkMode).container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {error ? <Text style={dynamicStyles(isDarkMode).error}>{error}</Text> : null}
        {news.length > 0 ? (
          news.map((item, index) => (
            <View key={index} style={dynamicStyles(isDarkMode).card}>
              <TouchableOpacity onPress={() => handlePress(item.link)} activeOpacity={0.8}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={dynamicStyles(isDarkMode).image} />
                ) : (
                  <View style={dynamicStyles(isDarkMode).imagePlaceholder}>
                    <Text style={dynamicStyles(isDarkMode).placeholderText}>Нет фото</Text>
                  </View>
                )}
                <View style={dynamicStyles(isDarkMode).content}>
                  <View style={dynamicStyles(isDarkMode).dateContainer}>
                    <Text style={dynamicStyles(isDarkMode).date}>{item.date}</Text>
                  </View>
                  <Text style={dynamicStyles(isDarkMode).title} numberOfLines={2} ellipsizeMode="tail">
                    {item.title}
                  </Text>
                  <Text style={dynamicStyles(isDarkMode).description} numberOfLines={3} ellipsizeMode="tail">
                    {item.description}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={dynamicStyles(isDarkMode).error}>Нет данных для отображения</Text>
        )}
      </ScrollView>
    </View>
  );
}

const dynamicStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#121212' : '#f0f0f0',
    },
    card: {
      marginHorizontal: 10,
      marginVertical: 10,
      borderRadius: 12,
      backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    },
    image: {
      width: '100%',
      height: 180,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    },
    imagePlaceholder: {
      width: '100%',
      height: 180,
      backgroundColor: isDarkMode ? '#2a2a2a' : '#e0e0e0',
      justifyContent: 'center',
      alignItems: 'center',
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
    },
    placeholderText: {
      color: isDarkMode ? '#777' : '#888',
      fontSize: 16,
      fontStyle: 'italic',
    },
    content: {
      padding: 15,
    },
    dateContainer: {
      marginBottom: 10,
      paddingBottom: 5,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333' : '#ddd',
    },
    date: {
      fontSize: 14,
      color: isDarkMode ? '#a0a0a0' : '#666666',
      fontStyle: 'italic',
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: isDarkMode ? '#e0e0e0' : '#222222',
      marginBottom: 10,
    },
    description: {
      fontSize: 16,
      color: isDarkMode ? '#c0c0c0' : '#444444',
      lineHeight: 24,
    },
    error: {
      fontSize: 16,
      color: isDarkMode ? '#ff5555' : '#cc0000',
      textAlign: 'center',
      margin: 15,
    },
  });