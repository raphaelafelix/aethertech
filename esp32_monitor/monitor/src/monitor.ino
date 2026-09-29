#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <TFT_eSPI.h>

// =====================================================
// WI-FI
// =====================================================

const char* WIFI_SSID = "rapha";
const char* WIFI_PASSWORD = "valarmorghulis";

// IP DO COMPUTADOR NA ETHERNET
const char* SERVER_HOST = "10.106.208.21";

const uint16_t SERVER_PORT = 3001;

const char* MONITOR_KEY = "1273871";

// ID da sala exibida neste monitor
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

void centralizarTexto(
    const String &texto,
    int y,
    int tamanho
)
{
    tft.setTextSize(tamanho);

    int larguraAproximada =
        texto.length() * 6 * tamanho;

    int x =
        (tft.width() - larguraAproximada) / 2;

    if (x < 0)
    {
        x = 0;
    }

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

void mostrarErro(
    const String &mensagem
)
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

    tft.setCursor(20, 185);

    tft.print(
        "Verifique Wi-Fi e servidor"
    );
}

// =====================================================
// MOSTRAR SALA
// =====================================================

void mostrarSala(
    JsonObject sala
)
{
    telaBase();

    String nome =
        sala["nome"] | "Sala";

    String status =
        sala["status"] | "livre";

    // =================================================
    // NOME
    // =================================================

    tft.setTextColor(TFT_BLACK);

    tft.setTextSize(2);

    tft.setCursor(12, 52);

    tft.print(nome);

    // =================================================
    // SALA OCUPADA
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

        tft.setTextColor(
            TFT_WHITE
        );

        centralizarTexto(
            "OCUPADA",
            108,
            3
        );
    }

    // =================================================
    // SALA INDISPONÍVEL
    // =================================================

    else if (
        status == "indisponivel"
    )
    {
        tft.fillRoundRect(
            25,
            90,
            270,
            58,
            8,
            TFT_DARKGREY
        );

        tft.setTextColor(
            TFT_WHITE
        );

        centralizarTexto(
            "INDISPONIVEL",
            108,
            2
        );
    }

    // =================================================
    // SALA LIVRE
    // =================================================

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

        tft.setTextColor(
            TFT_BLACK
        );

        centralizarTexto(
            "LIVRE",
            108,
            3
        );
    }

    // =================================================
    // INFORMAÇÕES DO AGENDAMENTO
    // =================================================

    tft.setTextColor(
        TFT_BLACK
    );

    tft.setTextSize(1);

    JsonObject atual =
        sala["atual"].as<JsonObject>();

    JsonObject proximo =
        sala["proximo"].as<JsonObject>();

    // =================================================
    // AGENDAMENTO ATUAL
    // =================================================

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

        tft.setCursor(
            15,
            170
        );

        tft.print(inicio);

        tft.print(" - ");

        tft.print(fim);

        tft.setCursor(
            15,
            188
        );

        tft.print(
            "Professor: "
        );

        tft.print(
            professor
        );

        tft.setCursor(
            15,
            206
        );

        tft.print(
            finalidade
        );
    }

    // =================================================
    // PRÓXIMO AGENDAMENTO
    // =================================================

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

        tft.setCursor(
            15,
            170
        );

        tft.print(
            "Proximo: "
        );

        tft.print(
            inicio
        );

        tft.print(
            " - "
        );

        tft.print(
            fim
        );

        tft.setCursor(
            15,
            188
        );

        tft.print(
            "Professor: "
        );

        tft.print(
            professor
        );

        tft.setCursor(
            15,
            206
        );

        tft.print(
            finalidade
        );
    }

    // =================================================
    // SEM AGENDAMENTO
    // =================================================

    else
    {
        tft.setCursor(
            15,
            180
        );

        tft.print(
            "Nenhum agendamento proximo."
        );
    }

    // =================================================
    // ATUALIZAÇÃO
    // =================================================

    tft.setCursor(
        15,
        228
    );

    tft.print(
        "Atualizacao automatica: 10s"
    );
}

// =====================================================
// CONSULTAR API
// =====================================================

void consultarAPI()
{
    // =================================================
    // VERIFICAR WI-FI
    // =================================================

    if (
        WiFi.status() != WL_CONNECTED
    )
    {
        mostrarConectando();

        WiFi.disconnect();

        WiFi.begin(
            WIFI_SSID,
            WIFI_PASSWORD
        );

        return;
    }

    // =================================================
    // CRIAR CLIENTE HTTP
    // =================================================

    HTTPClient http;

    String url =
        String("http://") +
        SERVER_HOST +
        ":" +
        SERVER_PORT +
        "/api/monitor/salas";

    Serial.println();

    Serial.println(
        "Consultando servidor:"
    );

    Serial.println(
        url
    );

    http.begin(url);

    // =================================================
    // CHAVE DA API
    // =================================================

    http.addHeader(
        "X-Monitor-Key",
        MONITOR_KEY
    );

    http.setTimeout(5000);

    // =================================================
    // GET
    // =================================================

    int code =
        http.GET();

    Serial.print(
        "HTTP: "
    );

    Serial.println(
        code
    );

    // =================================================
    // ERRO
    // =================================================

    if (
        code != HTTP_CODE_OK
    )
    {
        mostrarErro(
            "HTTP " +
            String(code)
        );

        http.end();

        return;
    }

    // =================================================
    // RECEBER RESPOSTA
    // =================================================

    String payload =
        http.getString();

    http.end();

    Serial.println(
        "Resposta:"
    );

    Serial.println(
        payload
    );

    // =================================================
    // CONVERTER JSON
    // =================================================

    JsonDocument doc;

    DeserializationError erro =
        deserializeJson(
            doc,
            payload
        );

    if (erro)
    {
        Serial.println(
            "Erro ao interpretar JSON:"
        );

        Serial.println(
            erro.c_str()
        );

        mostrarErro(
            "JSON invalido"
        );

        return;
    }

    // =================================================
    // PEGAR ARRAY DE SALAS
    // =================================================

    JsonArray salas =
        doc["salas"].as<JsonArray>();

    JsonObject encontrada;

    // =================================================
    // PROCURAR SALA
    // =================================================

    for (
        JsonObject sala : salas
    )
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

    if (
        encontrada.isNull()
    )
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
    Serial.begin(
        115200
    );

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
    // INICIALIZAR TELA
    // =================================================

    tft.init();

    // Rotação que funcionou no seu CYD
    tft.setRotation(3);

    mostrarConectando();

    // =================================================
    // WI-FI
    // =================================================

    WiFi.mode(
        WIFI_STA
    );

    WiFi.begin(
        WIFI_SSID,
        WIFI_PASSWORD
    );

    Serial.print(
        "Conectando ao Wi-Fi"
    );

    int tentativas = 0;

    while (
        WiFi.status() != WL_CONNECTED &&
        tentativas < 30
    )
    {
        delay(500);

        Serial.print(".");

        tentativas++;
    }

    Serial.println();

    // =================================================
    // CONECTADO
    // =================================================

    if (
        WiFi.status() ==
        WL_CONNECTED
    )
    {
        Serial.println(
            "Wi-Fi conectado!"
        );

        Serial.print(
            "IP do ESP32: "
        );

        Serial.println(
            WiFi.localIP()
        );

        Serial.print(
            "Servidor: "
        );

        Serial.println(
            SERVER_HOST
        );

        consultarAPI();
    }

    // =================================================
    // NÃO CONECTADO
    // =================================================

    else
    {
        Serial.println(
            "Wi-Fi nao conectado!"
        );

        mostrarErro(
            "Wi-Fi nao conectado"
        );
    }
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