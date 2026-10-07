# aplicar-correcao.ps1
#
# Escreve os 6 arquivos Kotlin do android-plugin com o conteudo correto.
# Rode este script a partir da RAIZ do projeto (a pasta que contem as
# pastas "android" e "android-plugin"), ex:
#
#   cd C:\Projetos\recepcao-visitantes
#   powershell -ExecutionPolicy Bypass -File .\aplicar-correcao.ps1
#
# Se a pasta do projeto for outra, edite a variavel $raiz abaixo.

$raiz = Get-Location
$base = Join-Path $raiz "android-plugin\src\main\java\br\com\aguilda\embeddedserver"
$model = Join-Path $base "model"

if (-not (Test-Path $base)) {
    Write-Host "ERRO: nao encontrei a pasta $base" -ForegroundColor Red
    Write-Host "Rode este script a partir da pasta raiz do projeto (recepcao-visitantes)." -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Force -Path $model | Out-Null

# ---------- Cargos.kt ----------
@'
package br.com.aguilda.embeddedserver.model

data class Cargo(
    val id: String,
    val label: String,
    val abreviacao: String? = null,
    val categoria: String
)

object Cargos {

    val LISTA: List<Cargo> = listOf(
        Cargo("presidente", "Presidente", "Presidente", "autoridade"),
        Cargo("senador", "Senador(a)", "Sen.", "autoridade"),
        Cargo("deputado_federal", "Deputado(a) Federal", "Dep. Federal", "autoridade"),
        Cargo("deputado_estadual", "Deputado(a) Estadual", "Dep. Estadual", "autoridade"),
        Cargo("prefeito", "Prefeito(a)", "Prefeito", "autoridade"),
        Cargo("vice_prefeito", "Vice-Prefeito(a)", "Vice-Prefeito", "autoridade"),
        Cargo("vereador", "Vereador(a)", "Vereador", "autoridade"),
        Cargo("militar", "Militar", "Militar", "autoridade"),
        Cargo("pastor", "Pastor-Presidente / Pastor", "Pr.", "eclesiastico"),
        Cargo("evangelista", "Evangelista", "Ev.", "eclesiastico"),
        Cargo("presbitero", "Presbitero / Anciao", "PB.", "eclesiastico"),
        Cargo("diacono", "Diacono", "Dc.", "eclesiastico"),
        Cargo("auxiliar", "Auxiliar / Cooperador", "Aux.", "eclesiastico"),
        Cargo("sem_cargo", "Sem cargo", null, "nenhum")
    )

    private val ordem: Map<String, Int> = LISTA.mapIndexed { indice, cargo -> cargo.id to indice }.toMap()

    fun precedencia(cargoId: String): Int = ordem[cargoId] ?: ordem.getValue("sem_cargo")

    fun get(cargoId: String): Cargo = LISTA.find { it.id == cargoId } ?: LISTA.last()

    fun tituloExibicao(cargoId: String): String = get(cargoId).abreviacao ?: ""
}
'@ | Set-Content -Path (Join-Path $model "Cargos.kt") -Encoding UTF8

# ---------- Visitante.kt ----------
@'
package br.com.aguilda.embeddedserver.model

data class Visitante(
    val id: String,
    var nome: String,
    var igreja: String,
    var local: String,
    var cargo: String,
    val criadoEm: Long
)

sealed class ItemExibicao {
    data class Individual(val visitante: Visitante) : ItemExibicao()
    data class Caravana(
        val etiqueta: String,
        val representante: Visitante,
        val membros: List<Visitante>,
        val totalPessoas: Int
    ) : ItemExibicao()
}
'@ | Set-Content -Path (Join-Path $model "Visitante.kt") -Encoding UTF8

# ---------- Grupos.kt ----------
@'
package br.com.aguilda.embeddedserver.model

object Grupos {

    private const val LIMITE_CARAVANA = 3

    fun calcular(visitantes: List<Visitante>): List<ItemExibicao> {
        val grupos = LinkedHashMap<String, MutableList<Visitante>>()

        for (v in visitantes) {
            val chave = "${v.igreja.trim().lowercase()}|${v.local.trim().lowercase()}"
            grupos.getOrPut(chave) { mutableListOf() }.add(v)
        }

        val itens = mutableListOf<ItemExibicao>()

        for ((_, membros) in grupos) {
            if (membros.size > LIMITE_CARAVANA) {
                val representante = membros.minByOrNull { Cargos.precedencia(it.cargo) } ?: membros.first()
                val titulo = Cargos.tituloExibicao(representante.cargo)
                val prefixo = if (titulo.isNotEmpty()) "$titulo " else ""
                val etiqueta = "$prefixo${representante.nome} + caravana - ${representante.igreja}, ${representante.local} (${membros.size} pessoas)"
                itens.add(
                    ItemExibicao.Caravana(
                        etiqueta = etiqueta,
                        representante = representante,
                        membros = membros,
                        totalPessoas = membros.size
                    )
                )
            } else {
                for (v in membros) {
                    itens.add(ItemExibicao.Individual(v))
                }
            }
        }

        return itens.sortedWith(
            compareBy(
                { item ->
                    when (item) {
                        is ItemExibicao.Individual -> Cargos.precedencia(item.visitante.cargo)
                        is ItemExibicao.Caravana -> Cargos.precedencia(item.representante.cargo)
                    }
                },
                { item ->
                    when (item) {
                        is ItemExibicao.Individual -> item.visitante.criadoEm
                        is ItemExibicao.Caravana -> item.membros.minOf { it.criadoEm }
                    }
                }
            )
        )
    }
}
'@ | Set-Content -Path (Join-Path $model "Grupos.kt") -Encoding UTF8

# ---------- Expiracao.kt ----------
@'
package br.com.aguilda.embeddedserver.model

object Expiracao {

    const val DURACAO_SESSAO_MS: Long = 10L * 60 * 60 * 1000

    fun calcularExpiracao(criadoEm: Long): Long = criadoEm + DURACAO_SESSAO_MS

    fun sessaoExpirada(criadoEm: Long, agora: Long = System.currentTimeMillis()): Boolean =
        agora >= calcularExpiracao(criadoEm)

    fun gerarResumoAgregado(visitantes: List<Visitante>, grupos: List<ItemExibicao>): Map<String, Any> {
        val totalCaravanas = grupos.count { it is ItemExibicao.Caravana }
        val totalComCargo = visitantes.count { it.cargo != "sem_cargo" }

        return mapOf(
            "totalVisitantes" to visitantes.size,
            "totalCaravanas" to totalCaravanas,
            "totalComCargo" to totalComCargo,
            "geradoEm" to System.currentTimeMillis()
        )
    }
}
'@ | Set-Content -Path (Join-Path $model "Expiracao.kt") -Encoding UTF8

# ---------- RecepcaoHttpServer.kt ----------
@'
package br.com.aguilda.embeddedserver

import br.com.aguilda.embeddedserver.model.Cargos
import br.com.aguilda.embeddedserver.model.Expiracao
import br.com.aguilda.embeddedserver.model.Grupos
import br.com.aguilda.embeddedserver.model.ItemExibicao
import br.com.aguilda.embeddedserver.model.Visitante
import fi.iki.elonen.NanoHTTPD
import fi.iki.elonen.NanoWSD
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock
import kotlin.random.Random

// Servidor local embutido no app Android, equivalente Kotlin do
// server/index.js (Node). Mesmas rotas, mesmo formato de dados, mesma
// logica de negocio (Cargos, Grupos, Expiracao).
// Roda dentro do proprio processo do app. Porta padrao 8080.
class RecepcaoHttpServer(port: Int = 8080) : NanoWSD(port) {

    private val lock = ReentrantLock()
    private val clientesWs = CopyOnWriteArrayList<WebSocket>()
    private val agendador = Executors.newSingleThreadScheduledExecutor()

    private var sessaoCriadaEm: Long = System.currentTimeMillis()
    private var pendentes = mutableListOf<Visitante>()
    private var confirmados = mutableListOf<Visitante>()
    private var resumoFinal: Map<String, Any>? = null

    override fun start() {
        super.start(NanoHTTPD.SOCKET_READ_TIMEOUT, false)
        agendador.scheduleAtFixedRate({
            val mudou = lock.withLock { verificarExpiracao() }
            if (mudou) broadcastEstado()
        }, 60, 60, TimeUnit.SECONDS)
    }

    override fun stop() {
        agendador.shutdownNow()
        super.stop()
    }

    fun enderecoLocal(ip: String): String = "http://$ip:${this.listeningPort}"

    private fun verificarExpiracao(): Boolean {
        if (Expiracao.sessaoExpirada(sessaoCriadaEm) && resumoFinal == null) {
            resumoFinal = Expiracao.gerarResumoAgregado(confirmados, Grupos.calcular(confirmados))
            pendentes = mutableListOf()
            confirmados = mutableListOf()
            return true
        }
        return false
    }

    private fun estadoJson(): JSONObject {
        lock.withLock { verificarExpiracao() }
        val obj = JSONObject()
        obj.put("sessaoCriadaEm", sessaoCriadaEm)
        obj.put("expiraEm", Expiracao.calcularExpiracao(sessaoCriadaEm))
        obj.put("expirada", resumoFinal != null)
        obj.put("resumoFinal", resumoFinal?.let { JSONObject(it) } ?: JSONObject.NULL)
        obj.put("pendentes", JSONArray(pendentes.map { visitanteJson(it) }))
        obj.put("grupos", gruposJson())
        return obj
    }

    private fun visitanteJson(v: Visitante): JSONObject = JSONObject().apply {
        put("id", v.id)
        put("nome", v.nome)
        put("igreja", v.igreja)
        put("local", v.local)
        put("cargo", v.cargo)
        put("criadoEm", v.criadoEm)
    }

    private fun gruposJson(): JSONArray {
        val arr = JSONArray()
        for (item in Grupos.calcular(confirmados)) {
            when (item) {
                is ItemExibicao.Individual -> {
                    arr.put(JSONObject().apply {
                        put("tipo", "individual")
                        put("visitante", visitanteJson(item.visitante))
                    })
                }
                is ItemExibicao.Caravana -> {
                    arr.put(JSONObject().apply {
                        put("tipo", "caravana")
                        put("etiqueta", item.etiqueta)
                        put("representante", visitanteJson(item.representante))
                        put("membros", JSONArray(item.membros.map { visitanteJson(it) }))
                        put("totalPessoas", item.totalPessoas)
                    })
                }
            }
        }
        return arr
    }

    private fun broadcastEstado() {
        val payload = JSONObject().apply {
            put("tipo", "estado")
            put("dados", estadoJson())
        }.toString()
        for (cliente in clientesWs) {
            try {
                cliente.send(payload)
            } catch (e: IOException) {
                clientesWs.remove(cliente)
            }
        }
    }

    private fun gerarId(): String {
        val alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        return (1..8).map { alfabeto[Random.nextInt(alfabeto.length)] }.joinToString("")
    }

    override fun serveHttp(session: IHTTPSession): Response {
        val uri = session.uri
        val metodo = session.method

        fun comCors(resp: Response): Response {
            resp.addHeader("Access-Control-Allow-Origin", "*")
            resp.addHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
            resp.addHeader("Access-Control-Allow-Headers", "Content-Type")
            return resp
        }

        if (metodo == Method.OPTIONS) {
            return comCors(newFixedLengthResponse(Response.Status.OK, "text/plain", ""))
        }

        fun corpoJson(): JSONObject {
            val map = HashMap<String, String>()
            session.parseBody(map)
            val bruto = map["postData"] ?: "{}"
            return JSONObject(bruto)
        }

        fun json(status: Response.Status, obj: Any): Response {
            val texto = when (obj) {
                is JSONObject -> obj.toString()
                is JSONArray -> obj.toString()
                else -> JSONObject().put("erro", obj.toString()).toString()
            }
            return comCors(newFixedLengthResponse(status, "application/json", texto))
        }

        return try {
            when {
                metodo == Method.GET && uri == "/api/estado" -> {
                    json(Response.Status.OK, estadoJson())
                }

                metodo == Method.POST && uri == "/api/pendentes" -> {
                    val body = corpoJson()
                    val nome = body.optString("nome").trim()
                    val igreja = body.optString("igreja").trim()
                    val local = body.optString("local").trim()
                    val cargo = body.optString("cargo", "sem_cargo").ifEmpty { "sem_cargo" }

                    if (nome.isEmpty() || igreja.isEmpty() || local.isEmpty()) {
                        return json(
                            Response.Status.BAD_REQUEST,
                            JSONObject().put("erro", "nome, igreja e local sao obrigatorios")
                        )
                    }

                    val visitante = Visitante(
                        id = gerarId(),
                        nome = nome,
                        igreja = igreja,
                        local = local,
                        cargo = cargo,
                        criadoEm = System.currentTimeMillis()
                    )
                    lock.withLock { pendentes.add(visitante) }
                    broadcastEstado()
                    json(Response.Status.CREATED, visitanteJson(visitante))
                }

                metodo == Method.PATCH && uri.startsWith("/api/pendentes/") && !uri.endsWith("/confirmar") -> {
                    val id = uri.removePrefix("/api/pendentes/")
                    val body = corpoJson()
                    val item = lock.withLock { pendentes.find { it.id == id } }
                        ?: return json(Response.Status.NOT_FOUND, JSONObject().put("erro", "nao encontrado"))

                    lock.withLock {
                        if (body.has("nome")) item.nome = body.getString("nome")
                        if (body.has("igreja")) item.igreja = body.getString("igreja")
                        if (body.has("local")) item.local = body.getString("local")
                        if (body.has("cargo")) item.cargo = body.getString("cargo")
                    }
                    broadcastEstado()
                    json(Response.Status.OK, visitanteJson(item))
                }

                metodo == Method.POST && uri.endsWith("/confirmar") -> {
                    val id = uri.removePrefix("/api/pendentes/").removeSuffix("/confirmar")
                    val item = lock.withLock {
                        val idx = pendentes.indexOfFirst { it.id == id }
                        if (idx == -1) null else pendentes.removeAt(idx).also { confirmados.add(it) }
                    } ?: return json(Response.Status.NOT_FOUND, JSONObject().put("erro", "nao encontrado"))

                    broadcastEstado()
                    json(Response.Status.OK, visitanteJson(item))
                }

                metodo == Method.DELETE && uri.startsWith("/api/pendentes/") -> {
                    val id = uri.removePrefix("/api/pendentes/")
                    lock.withLock { pendentes.removeAll { it.id == id } }
                    broadcastEstado()
                    comCors(newFixedLengthResponse(Response.Status.NO_CONTENT, "application/json", ""))
                }

                metodo == Method.POST && uri == "/api/sessao/reiniciar" -> {
                    lock.withLock {
                        sessaoCriadaEm = System.currentTimeMillis()
                        pendentes = mutableListOf()
                        confirmados = mutableListOf()
                        resumoFinal = null
                    }
                    broadcastEstado()
                    json(Response.Status.OK, estadoJson())
                }

                else -> comCors(newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "not found"))
            }
        } catch (e: Exception) {
            json(Response.Status.INTERNAL_ERROR, JSONObject().put("erro", e.message ?: "erro interno"))
        }
    }

    override fun openWebSocket(handshake: IHTTPSession): WebSocket {
        return object : WebSocket(handshake) {
            override fun onOpen() {
                clientesWs.add(this)
                try {
                    send(JSONObject().put("tipo", "estado").put("dados", estadoJson()).toString())
                } catch (e: IOException) {
                    // conexao pode ja ter caido; sera removida no onClose
                }
            }

            override fun onClose(
                code: WebSocketFrame.CloseCode?,
                reason: String?,
                initiatedByRemote: Boolean
            ) {
                clientesWs.remove(this)
            }

            override fun onMessage(message: WebSocketFrame) {
                // App Apresentacao nao envia comandos por WS nesta versao
            }

            override fun onPong(pong: WebSocketFrame) {}

            override fun onException(exception: IOException) {
                clientesWs.remove(this)
            }
        }
    }
}
'@ | Set-Content -Path (Join-Path $base "RecepcaoHttpServer.kt") -Encoding UTF8

# ---------- EmbeddedServerPlugin.kt ----------
@'
package br.com.aguilda.embeddedserver

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.net.Inet4Address
import java.net.NetworkInterface

@CapacitorPlugin(name = "EmbeddedServer")
class EmbeddedServerPlugin : Plugin() {

    private var servidor: RecepcaoHttpServer? = null

    @PluginMethod
    fun iniciar(call: PluginCall) {
        val porta = call.getInt("porta", 8080) ?: 8080

        try {
            val servidorAtual = servidor
            if (servidorAtual != null) {
                val resultado = JSObject()
                resultado.put("ip", obterIpLocal())
                resultado.put("porta", servidorAtual.listeningPort)
                resultado.put("url", servidorAtual.enderecoLocal(obterIpLocal()))
                call.resolve(resultado)
                return
            }

            val novoServidor = RecepcaoHttpServer(porta)
            novoServidor.start()
            servidor = novoServidor

            val ip = obterIpLocal()
            val resultado = JSObject()
            resultado.put("ip", ip)
            resultado.put("porta", novoServidor.listeningPort)
            resultado.put("url", novoServidor.enderecoLocal(ip))
            call.resolve(resultado)
        } catch (e: Exception) {
            call.reject("Nao foi possivel iniciar o servidor: " + e.message, e)
        }
    }

    @PluginMethod
    fun parar(call: PluginCall) {
        servidor?.stop()
        servidor = null
        call.resolve()
    }

    @PluginMethod
    fun status(call: PluginCall) {
        val servidorAtual = servidor
        val resultado = JSObject()
        if (servidorAtual != null) {
            resultado.put("rodando", true)
            resultado.put("ip", obterIpLocal())
            resultado.put("porta", servidorAtual.listeningPort)
        } else {
            resultado.put("rodando", false)
            resultado.put("ip", JSObject.NULL)
        }
        call.resolve(resultado)
    }

    private fun obterIpLocal(): String {
        try {
            val interfaces = NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val iface = interfaces.nextElement()
                if (!iface.isUp || iface.isLoopback) continue

                val enderecos = iface.inetAddresses
                while (enderecos.hasMoreElements()) {
                    val endereco = enderecos.nextElement()
                    if (endereco is Inet4Address && !endereco.isLoopbackAddress) {
                        return endereco.hostAddress ?: continue
                    }
                }
            }
        } catch (e: Exception) {
            // sem interface de rede disponivel; usa fallback abaixo
        }
        return "127.0.0.1"
    }
}
'@ | Set-Content -Path (Join-Path $base "EmbeddedServerPlugin.kt") -Encoding UTF8

Write-Host ""
Write-Host "Pronto! Os 6 arquivos foram escritos em:" -ForegroundColor Green
Write-Host $base -ForegroundColor Green
Write-Host $model -ForegroundColor Green
Write-Host ""
Write-Host "Agora volte ao Android Studio, confirme que ele recarregou os arquivos (ou feche e reabra os que estavam abertos), e rode Build > Make Project (Ctrl+F9)." -ForegroundColor Yellow
