#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>

// =============================
// CONFIGURAÇÃO DO PROJETO
// =============================
const char* WIFI_SSID = "WIFI-IOT-CPF122";
const char* WIFI_PASSWORD = "ac1ce2ss2@IOT";

// IP do computador onde o Node.js está rodando.
// NÃO use localhost ou 127.0.0.1 aqui.
const char* SERVER_HOST = "192.168.56.1";
const uint16_t SERVER_PORT = 3001;
const char* MONITOR_KEY = "MONITOR_SENAI_2026";

// ID da sala que este monitor acompanha.
// Ex.: 1 = Sala de Informática 01.
const int ROOM_ID = 1;

// =============================
// DISPLAY ILI9341 2.4/2.8"
// ESP32 DevKit V1 (SPI)
// =============================
#define TFT_CS   5
#define TFT_DC   2
#define TFT_RST  4
#define TFT_MOSI 23
#define TFT_MISO 19
#define TFT_SCLK 18

Adafruit_ILI9341 tft(TFT_CS, TFT_DC, TFT_RST);

unsigned long ultimaConsulta = 0;
const unsigned long INTERVALO = 10000;

void centralizarTexto(const String &texto, int y, int tamanho) {
  tft.setTextSize(tamanho);
  int16_t x1, y1;
  uint16_t w, h;
  tft.getTextBounds(texto, 0, y, &x1, &y1, &w, &h);
  int x = (tft.width() - w) / 2;
  tft.setCursor(x, y);
  tft.print(texto);
}

void telaBase() {
  tft.fillScreen(ILI9341_WHITE);
  tft.setTextColor(ILI9341_BLACK);
  tft.setTextSize(2);
  tft.setCursor(12, 10);
  tft.print("SENAI | AGENDAMENTO");
  tft.drawFastHLine(10, 38, 300, ILI9341_RED);
}

void mostrarConectando() {
  telaBase();
  centralizarTexto("CONECTANDO...", 85, 2);
  centralizarTexto("Wi-Fi", 120, 2);
}

void mostrarErro(const String &mensagem) {
  telaBase();
  tft.setTextColor(ILI9341_RED);
  centralizarTexto("ERRO DE CONEXAO", 70, 2);
  tft.setTextColor(ILI9341_BLACK);
  centralizarTexto(mensagem, 115, 1);
  tft.setTextSize(1);
  tft.setCursor(30, 185);
  tft.print("Verifique Wi-Fi e IP do servidor");
}

void mostrarSala(JsonObject sala) {
  telaBase();

  String nome = sala["nome"] | "Sala";
  String status = sala["status"] | "livre";

  tft.setTextColor(ILI9341_BLACK);
  tft.setTextSize(2);
  tft.setCursor(12, 52);
  tft.print(nome);

  if (status == "ocupada") {
    tft.fillRoundRect(25, 90, 270, 58, 8, ILI9341_RED);
    tft.setTextColor(ILI9341_WHITE);
    centralizarTexto("OCUPADA", 108, 3);
  } else if (status == "indisponivel") {
    tft.fillRoundRect(25, 90, 270, 58, 8, ILI9341_DARKGREY);
    tft.setTextColor(ILI9341_WHITE);
    centralizarTexto("INDISPONIVEL", 108, 2);
  } else {
    tft.fillRoundRect(25, 90, 270, 58, 8, ILI9341_GREEN);
    tft.setTextColor(ILI9341_BLACK);
    centralizarTexto("LIVRE", 108, 3);
  }

  tft.setTextColor(ILI9341_BLACK);
  tft.setTextSize(1);
  JsonObject atual = sala["atual"].as<JsonObject>();
  JsonObject proximo = sala["proximo"].as<JsonObject>();

  if (!atual.isNull()) {
    String horario = String((const char*)atual["horarioInicio"]) + " - " + String((const char*)atual["horarioFim"]);
    tft.setCursor(15, 170);
    tft.print(horario);
    tft.setCursor(15, 188);
    tft.print("Professor: ");
    tft.print((const char*)atual["professor"]);
    tft.setCursor(15, 206);
    tft.print((const char*)atual["finalidade"]);
  } else if (!proximo.isNull()) {
    tft.setCursor(15, 170);
    tft.print("Proximo: ");
    tft.print((const char*)proximo["horarioInicio"]);
    tft.print(" - ");
    tft.print((const char*)proximo["horarioFim"]);
    tft.setCursor(15, 188);
    tft.print("Professor: ");
    tft.print((const char*)proximo["professor"]);
    tft.setCursor(15, 206);
    tft.print((const char*)proximo["finalidade"]);
  } else {
    tft.setCursor(15, 180);
    tft.print("Nenhum agendamento proximo.");
  }

  tft.setCursor(15, 228);
  tft.print("Atualizacao automatica: 10s");
}

void consultarAPI() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    mostrarConectando();
    return;
  }

  HTTPClient http;
  String url = String("http://") + SERVER_HOST + ":" + SERVER_PORT + "/api/monitor/salas";
  http.begin(url);
  http.addHeader("X-Monitor-Key", MONITOR_KEY);
  http.setTimeout(5000);

  int code = http.GET();
  if (code != HTTP_CODE_OK) {
    mostrarErro("HTTP " + String(code));
    http.end();
    return;
  }

  String payload = http.getString();
  http.end();

  JsonDocument doc;
  DeserializationError erro = deserializeJson(doc, payload);
  if (erro) {
    mostrarErro("JSON invalido");
    return;
  }

  JsonArray salas = doc["salas"].as<JsonArray>();
  JsonObject encontrada;

  for (JsonObject sala : salas) {
    if ((int)sala["id"] == ROOM_ID) {
      encontrada = sala;
      break;
    }
  }

  if (encontrada.isNull()) {
    mostrarErro("Sala nao encontrada");
    return;
  }

  mostrarSala(encontrada);
}

void setup() {
  Serial.begin(115200);

  SPI.begin(TFT_SCLK, TFT_MISO, TFT_MOSI, TFT_CS);
  tft.begin();
  tft.setRotation(1); // 320x240
  mostrarConectando();

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 30) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }

  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi conectado. IP do ESP32: ");
    Serial.println(WiFi.localIP());
    consultarAPI();
  } else {
    mostrarErro("Wi-Fi nao conectado");
  }
}

void loop() {
  if (millis() - ultimaConsulta >= INTERVALO) {
    ultimaConsulta = millis();
    consultarAPI();
  }
}
