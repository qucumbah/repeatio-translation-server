import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

import LanguageTranslator from 'ibm-watson/language-translator/v3.js';
import authenticator from 'ibm-watson/auth/index.js';

const { IamAuthenticator } = authenticator;

const languageTranslator = new LanguageTranslator({
  version: '2018-05-01',
  authenticator: new IamAuthenticator({
    apikey: process.env.TRANSLATION_API_KEY,
  }),
  serviceUrl: process.env.TRANSLATION_API_URL,
});

const getTranslation = async (source, target, text) => {
  const dictionaryApiRequest = `https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=${process.env.DICTIONARY_API_KEY}&lang=${source}-${target}&text=${text}`;

  const dictionaryApiResponse = (
    await fetch(dictionaryApiRequest).catch(console.log)
  );

  if (dictionaryApiResponse) {
    const dictionaryResponseJson = await dictionaryApiResponse.json();
    const dictionaryApiHasResult = (dictionaryResponseJson.def.length !== 0);

    if (dictionaryApiHasResult) {
      return dictionaryResponseJson.def.map((definition) => {
        const joinedTranslations = definition.tr
          .map((translation) => translation.text)
          .join(', ');

        return `${definition.pos}:\n${joinedTranslations}`;
      }).join('\n');
    }
  }

  const translationParams = {
    source,
    target,
    text,
  };
  const translationApiResponse = (
    await languageTranslator.translate(translationParams).catch(console.log)
  );

  const successStatusCode = 200;
  if (translationApiResponse?.status === successStatusCode) {
    return translationApiResponse.result.translations
      .map(({ translation }) => translation)
      .join('\n');
  }

  return 'Translation error';
};

const app = express();

app.use(cors());

app.get('/translate', async (req, res) => {
  const { source, target, text } = req.query;

  if (!source) {
    res.send('Error: source language not specified');
    return;
  }

  if (!target) {
    res.send('Error: target language not specified');
    return;
  }

  if (!text) {
    res.send('Error: text not specified');
    return;
  }

  res.send(await getTranslation(source, target, text));
});

app.listen(process.env.PORT);
