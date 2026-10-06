#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <TFT_eSPI.h>

const char* WIFI_SSID = "POCO C85";
const char* WIFI_PASSWORD = "valarmorghulis";
const char* SERVER_HOST = "10.216.7.235";
const uint16_t SERVER_PORT = 3001;
const char* MONITOR_KEY = "1273871";
const int ROOM_ID = 1;

TFT_eSPI tft = TFT_eSPI();

unsigned long ultimaConsulta = 0;
const unsigned long INTERVALO = 10000; 

void centralizarTexto(String texto, int y, int tamanho) {
  tft.setTextSize(tamanho);

  int largura = texto.length() * 6 * tamanho;
  int x = (tft.width() - largura) / 2;

  if (x < 0) x = 0;

  tft.setCursor(x, y);
  tft.print(texto);
}

void telaBase() {
  tft.fillScreen(TFT_WHITE);
  tft.setTextColor(TFT_BLACK);
  tft.setTextSize(2);
  tft.setCursor(12, 10);
  tft.print("SENAI | AGENDAMENTO");
  tft.drawFastHLine(10, 38, 300, TFT_RED);
}

void mostrarConectando() {
  telaBase();
  centralizarTexto("CONECTANDO...", 85, 2);
  centralizarTexto("Wi-Fi", 120, 2);
}

void mostrarErro(String mensagem) {
  telaBase();

  tft.setTextColor(TFT_RED);
  centralizarTexto("ERRO DE CONEXAO", 70, 2);

  tft.setTextColor(TFT_BLACK);
  centralizarTexto(mensagem, 115, 1);

  tft.setCursor(20, 185);
  tft.setTextSize(1);
  tft.print("Verifique Wi-Fi e servidor");
}

void mostrarSala(JsonObject sala) {
  telaBase();

  String nome = sala["nome"] | "Sala";
  String status = sala["status"] | "livre";

  tft.setTextColor(TFT_BLACK);
  tft.setTextSize(2);
  tft.setCursor(12, 52);
  tft.print(nome);

  if (status == "ocupada") {
    tft.fillRoundRect(25, 90, 270, 58, 8, TFT_RED);
    tft.setTextColor(TFT_WHITE);
    centralizarTexto("OCUPADA", 108, 3);
  }
  else if (status == "indisponivel") {
    tft.fillRoundRect(25, 90, 270, 58, 8, TFT_DARKGREY);
    tft.setTextColor(TFT_WHITE);
    centralizarTexto("INDISPONIVEL", 108, 2);
  }
  else {
    tft.fillRoundRect(25, 90, 270, 58, 8, TFT_GREEN);
    tft.setTextColor(TFT_BLACK);
    centralizarTexto("LIVRE", 108, 3);
  }

  tft.setTextColor(TFT_BLACK);
  tft.setTextSize(1);

  JsonObject atual = sala["atual"].as<JsonObject>();
  JsonObject proximo = sala["proximo"].as<JsonObject>();

  if (!atual.isNull()) {
    const char* inicio = atual["horarioInicio"] | "";
    const char* fim = atual["horarioFim"] | "";
    const char* professor = atual["professor"] | "";
    const char* finalidade = atual["finalidade"] | "";

    tft.setCursor(15, 170);
    tft.print(inicio);
    tft.print(" - ");
    tft.print(fim);

    tft.setCursor(15, 188);
    tft.print("Professor: ");
    tft.print(professor);

    tft.setCursor(15, 206);
    tft.print(finalidade);
  }
  else if (!proximo.isNull()) {
    const char* inicio = proximo["horarioInicio"] | "";
    const char* fim = proximo["horarioFim"] | "";
    const char* professor = proximo["professor"] | "";
    const char* finalidade = proximo["finalidade"] | "";

    tft.setCursor(15, 170);
    tft.print("Proximo: ");
    tft.print(inicio);
    tft.print(" - ");
    tft.print(fim);

    tft.setCursor(15, 188);
    tft.print("Professor: ");
    tft.print(professor);

    tft.setCursor(15, 206);
    tft.print(finalidade);
  }
  else {
    tft.setCursor(15, 180);
    tft.print("Nenhum agendamento proximo.");
  }

  tft.setCursor(15, 228);
  tft.print("Atualizacao automatica: 10s");
}

void consultarAPI() {
  if (WiFi.status() != WL_CONNECTED) {
    mostrarConectando();
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    return;
  }

  HTTPClient http;

  String url = "http://" + String(SERVER_HOST) + ":" +
               String(SERVER_PORT) + "/api/monitor/salas";

  Serial.println("\nConsultando servidor:");
  Serial.println(url);

  http.begin(url);
  http.addHeader("X-Monitor-Key", MONITOR_KEY);
  http.setTimeout(5000);

  int code = http.GET();

  Serial.print("HTTP: ");
  Serial.println(code);

  if (code != HTTP_CODE_OK) {
    mostrarErro("HTTP " + String(code));
    http.end();
    return;
  }

  String payload = http.getString();
  http.end();

  Serial.println("Resposta:");
  Serial.println(payload);

  JsonDocument doc;

  DeserializationError erro = deserializeJson(doc, payload);

  if (erro) {
    Serial.println("Erro ao interpretar JSON:");
    Serial.println(erro.c_str());
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
  delay(500);

  Serial.println("\n================================");
  Serial.println("SENAI - MONITOR DE SALA");
  Serial.println("================================");

  tft.init();
  tft.setRotation(3);

  mostrarConectando();

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Conectando ao Wi-Fi");

  int tentativas = 0;

  while (WiFi.status() != WL_CONNECTED && tentativas < 30) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Wi-Fi conectado!");
    Serial.print("IP do ESP32: ");
    Serial.println(WiFi.localIP());

    Serial.print("Servidor: ");
    Serial.println(SERVER_HOST);

    consultarAPI();
  }
  else {
    Serial.println("Wi-Fi nao conectado!");
    mostrarErro("Wi-Fi nao conectado");
  }
}

void loop() {
  if (millis() - ultimaConsulta >= INTERVALO) {
    ultimaConsulta = millis();
    consultarAPI();
  }
}