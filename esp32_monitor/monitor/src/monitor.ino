#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <TFT_eSPI.h>

// =====================================================
// WI-FI DO PRÓPRIO MONITOR
// =====================================================

const char* AP_SSID = "SENAI-MONITOR";
const char* AP_PASSWORD = "senai123";

// IP do computador que estará rodando o servidor Node.js
const char* SERVER_HOST = "192.168.4.2";
const uint16_t SERVER_PORT = 3001;

// Chave usada pela API
const char* MONITOR_KEY = "1273871";

// ID da sala que este monitor representa
const int ROOM_ID = 1;

// =====================================================
// TELA CYD
// =====================================================

TFT_eSPI tft = TFT_eSPI();

// =====================================================
// CONFIGURAÇÕES
// =====================================================

unsigned long ultimaConsulta = 0;
const unsigned long INTERVALO = 10000;

// =====================================================
// CENTRALIZAR TEXTO
// =====================================================

void centralizarTexto(const String &texto, int y, int tamanho)
{
    tft.setTextSize(tamanho);

    // TFT_eSPI não usa getTextBounds() dessa forma.
    // Vamos calcular uma posição aproximada.
    int larguraAproximada = texto.length() * 6 * tamanho;

    int x = (tft.width() - larguraAproximada) / 2;

    if (x < 0)
        x = 0;

    tft.setCursor(x, y);
    tft.print(texto);
}

// =====================================================
// TELA BASE
// =====================================================

void telaBase()
{
    tft.fillScreen(TFT_WHITE);

    tft.setTextColor(TFT_BLACK);
    tft.setTextSize(2);

    tft.setCursor(12, 10);
    tft.print("SENAI | AGENDAMENTO");

    tft.drawFastHLine(
        10,
        38,
        300,
        TFT_RED
    );
}

// =====================================================
// TELA CONECTANDO
// =====================================================

void mostrarConectando()
{
    telaBase();

    tft.setTextColor(TFT_BLACK);

    centralizarTexto(
        "CONECTANDO...",
        85,
        2
    );

    centralizarTexto(
        "Wi-Fi",
        120,
        2
    );
}

// =====================================================
// TELA DE ERRO
// =====================================================

void mostrarErro(const String &mensagem)
{
    telaBase();

    tft.setTextColor(TFT_RED);

    centralizarTexto(
        "ERRO DE CONEXAO",
        70,
        2
    );

    tft.setTextColor(TFT_BLACK);

    centralizarTexto(
        mensagem,
        115,
        1
    );

    tft.setTextSize(1);

    tft.setCursor(30, 185);

    tft.print(
        "Verifique Wi-Fi e servidor"
    );
}

// =====================================================
// MOSTRAR SALA
// =====================================================

void mostrarSala(JsonObject sala)
{
    telaBase();

    String nome = sala["nome"] | "Sala";
    String status = sala["status"] | "livre";

    // Nome da sala
    tft.setTextColor(TFT_BLACK);
    tft.setTextSize(2);

    tft.setCursor(12, 52);
    tft.print(nome);

    // =================================================
    // STATUS
    // =================================================

    if (status == "ocupada")
    {
        tft.fillRoundRect(
            25,
            90,
            270,
            58,
            8,
            TFT_RED
        );

        tft.setTextColor(TFT_WHITE);

        centralizarTexto(
            "OCUPADA",
            108,
            3
        );
    }

    else if (status == "indisponivel")
    {
        tft.fillRoundRect(
            25,
            90,
            270,
            58,
            8,
            TFT_DARKGREY
        );

        tft.setTextColor(TFT_WHITE);

        centralizarTexto(
            "INDISPONIVEL",
            108,
            2
        );
    }

    else
    {
        tft.fillRoundRect(
            25,
            90,
            270,
            58,
            8,
            TFT_GREEN
        );

        tft.setTextColor(TFT_BLACK);

        centralizarTexto(
            "LIVRE",
            108,
            3
        );
    }

    // =================================================
    // INFORMAÇÕES DO AGENDAMENTO
    // =================================================

    tft.setTextColor(TFT_BLACK);
    tft.setTextSize(1);

    JsonObject atual =
        sala["atual"].as<JsonObject>();

    JsonObject proximo =
        sala["proximo"].as<JsonObject>();

    // -------------------------------------------------
    // SALA OCUPADA
    // -------------------------------------------------

    if (!atual.isNull())
    {
        const char* inicio =
            atual["horarioInicio"] | "";

        const char* fim =
            atual["horarioFim"] | "";

        const char* professor =
            atual["professor"] | "";

        const char* finalidade =
            atual["finalidade"] | "";

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

    // -------------------------------------------------
    // PRÓXIMO AGENDAMENTO
    // -------------------------------------------------

    else if (!proximo.isNull())
    {
        const char* inicio =
            proximo["horarioInicio"] | "";

        const char* fim =
            proximo["horarioFim"] | "";

        const char* professor =
            proximo["professor"] | "";

        const char* finalidade =
            proximo["finalidade"] | "";

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

    // -------------------------------------------------
    // SEM AGENDAMENTO
    // -------------------------------------------------

    else
    {
        tft.setCursor(15, 180);

        tft.print(
            "Nenhum agendamento proximo."
        );
    }

    // =================================================
    // ATUALIZAÇÃO
    // =================================================

    tft.setCursor(15, 228);

    tft.print(
        "Atualizacao automatica: 10s"
    );
}

// =====================================================
// CONSULTAR API
// =====================================================

void consultarAPI()
{
    // Verifica se o ESP32 está conectado ao
    // próprio Wi-Fi
    if (WiFi.status() != WL_CONNECTED)
    {
        mostrarErro(
            "Wi-Fi desconectado"
        );

        return;
    }

    HTTPClient http;

    String url =
        String("http://") +
        SERVER_HOST +
        ":" +
        SERVER_PORT +
        "/api/monitor/salas";

    Serial.println(
        "Consultando API:"
    );

    Serial.println(url);

    http.begin(url);

    http.addHeader(
        "X-Monitor-Key",
        MONITOR_KEY
    );

    http.setTimeout(5000);

    int code = http.GET();

    Serial.print(
        "HTTP: "
    );

    Serial.println(code);

    // =================================================
    // ERRO HTTP
    // =================================================

    if (code != HTTP_CODE_OK)
    {
        mostrarErro(
            "HTTP " + String(code)
        );

        http.end();

        return;
    }

    // =================================================
    // RECEBER JSON
    // =================================================

    String payload =
        http.getString();

    http.end();

    Serial.println(
        "Resposta:"
    );

    Serial.println(payload);

    // =================================================
    // INTERPRETAR JSON
    // =================================================

    JsonDocument doc;

    DeserializationError erro =
        deserializeJson(
            doc,
            payload
        );

    if (erro)
    {
        mostrarErro(
            "JSON invalido"
        );

        Serial.println(
            "Erro JSON:"
        );

        Serial.println(
            erro.c_str()
        );

        return;
    }

    // =================================================
    // PEGAR SALAS
    // =================================================

    JsonArray salas =
        doc["salas"].as<JsonArray>();

    JsonObject encontrada;

    for (JsonObject sala : salas)
    {
        if (
            (int)sala["id"] ==
            ROOM_ID
        )
        {
            encontrada = sala;

            break;
        }
    }

    // =================================================
    // SALA NÃO ENCONTRADA
    // =================================================

    if (encontrada.isNull())
    {
        mostrarErro(
            "Sala nao encontrada"
        );

        return;
    }

    // =================================================
    // MOSTRAR SALA
    // =================================================

    mostrarSala(
        encontrada
    );
}

// =====================================================
// SETUP
// =====================================================

void setup()
{
    Serial.begin(115200);

    delay(500);

    Serial.println();
    Serial.println(
        "================================"
    );

    Serial.println(
        "SENAI - MONITOR DE SALA"
    );

    Serial.println(
        "================================"
    );

    // =================================================
    // TELA
    // =================================================

    tft.init();

    // Essa foi a rotação que funcionou
    // no seu CYD
    tft.setRotation(3);

    mostrarConectando();

    // =================================================
    // CRIAR WI-FI DO ESP32
    // =================================================

    WiFi.mode(WIFI_AP);

    bool resultado =
        WiFi.softAP(
            AP_SSID,
            AP_PASSWORD
        );

    if (!resultado)
    {
        mostrarErro(
            "Falha ao criar Wi-Fi"
        );

        Serial.println(
            "ERRO ao criar Access Point"
        );

        return;
    }

    // =================================================
    // IP DO ESP32
    // =================================================

    IPAddress ip =
        WiFi.softAPIP();

    Serial.println();

    Serial.println(
        "Wi-Fi criado!"
    );

    Serial.print(
        "Nome: "
    );

    Serial.println(
        AP_SSID
    );

    Serial.print(
        "Senha: "
    );

    Serial.println(
        AP_PASSWORD
    );

    Serial.print(
        "IP do ESP32: "
    );

    Serial.println(ip);

    // =================================================
    // MOSTRAR SALA
    // =================================================

    delay(1000);

    telaBase();

    tft.setTextColor(TFT_BLACK);

    centralizarTexto(
        "Wi-Fi pronto!",
        70,
        2
    );

    centralizarTexto(
        "SENAI-MONITOR",
        110,
        2
    );

    centralizarTexto(
        "Aguardando servidor...",
        150,
        1
    );

    delay(2000);

    // Primeira consulta
    consultarAPI();
}

// =====================================================
// LOOP
// =====================================================

void loop()
{
    if (
        millis() -
        ultimaConsulta >=
        INTERVALO
    )
    {
        ultimaConsulta =
            millis();

        consultarAPI();
    }
}