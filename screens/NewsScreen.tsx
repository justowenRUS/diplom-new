// screens/MainScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useTheme } from '../ThemeContext';
import { parse, HTMLElement } from 'node-html-parser';

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('1. Запрос списка новостей...');
        const response = await fetch('http://188.130.154.89:3000/news');
        const html = await response.text();
        const root = parse(html);
        const newsSlider = root.querySelector('.app-news-tab-list-box-slider');
        if (!newsSlider) {
          setError('Блок .app-news-tab-list-box-slider не найден');
          setNews([{ date: '', title: 'Новости не найдены', description: '', imageUrl: '', link: '' }]);
          return;
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
            const detailResponse = await fetch(`http://188.130.154.89:3000/news?url=${encodeURIComponent(newsItem.link)}`);
            const detailHtml = await detailResponse.text();
            const detailRoot = parse(detailHtml);

            const head = detailRoot.querySelector('.kris-component-head h1');
            const title = head?.childNodes[0]?.textContent.trim() || newsItem.title;
            const date = head?.querySelector('small')?.textContent || newsItem.date;
            const description = detailRoot.querySelector('.kris-redaktor-format p')?.textContent || 'Нет описания';
            const img = detailRoot.querySelector('.kris-redaktor-format img');
            const imageUrl = img ? `https://spo-13.mskobr.ru${img.getAttribute('src')}` : '';

            return { date, title, description, imageUrl, link: newsItem.link };
          })
        );

        console.log('3. Устанавливаем новости:', detailedNews);
        setNews(detailedNews.length > 0 ? detailedNews : [{ date: '', title: 'Новостей нет', description: '', imageUrl: '', link: '' }]);
      } catch (error) {
        console.error('Ошибка:', error);
        setError('Ошибка загрузки данных: ' + error.message);
        setNews([{ date: '', title: 'Ошибка загрузки данных', description: '', imageUrl: '', link: '' }]);
      }
    };

    fetchData();
  }, []);

  return (
    <View style={dynamicStyles(isDarkMode).container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {error ? <Text style={dynamicStyles(isDarkMode).error}>{error}</Text> : null}
        {news.length > 0 ? (
          news.map((item, index) => (
            <View key={index} style={dynamicStyles(isDarkMode).card}>
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
                <Text style={dynamicStyles(isDarkMode).title}>{item.title}</Text>
                <Text style={dynamicStyles(isDarkMode).description}>{item.description}</Text>
              </View>
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