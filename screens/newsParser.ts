import axios from "axios";
import * as cheerio from "cheerio";

const NEWS_URL = "https://spo-13.mskobr.ru/";

export const fetchNews = async () => {
  try {
    const { data } = await axios.get(NEWS_URL);
    const $ = cheerio.load(data);
    const newsList: { title: string; date: string; image: string; description: string }[] = [];

    $(".news-item").each((_, element) => {
      const title = $(element).find(".news-title").text().trim();
      const date = $(element).find(".news-date").text().trim();
      const image = $(element).find("img").attr("src") || "";
      const description = $(element).find(".news-description").text().trim();

      if (title && date) {
        newsList.push({
          title,
          date,
          image: image.startsWith("http") ? image : NEWS_URL + image,
          description,
        });
      }
    });

    return newsList;
  } catch (error) {
    console.error("Ошибка парсинга новостей:", error);
    return [];
  }
};
