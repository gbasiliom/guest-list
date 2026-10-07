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
import java.io.File
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
// Se arquivoEstado for informado, a lista da sessao e gravada nele a cada mudanca
// e recarregada ao abrir o app, ENQUANTO a sessao nao tiver passado de 10h. Passou
// das 10h: os nomes sao descartados e fica so o resumo anonimo (LGPD). O arquivo deve
// ficar em area privada do app e fora do backup (noBackupFilesDir).
class RecepcaoHttpServer(port: Int = 8080, private val arquivoEstado: File? = null) : NanoWSD(port) {

    private val lock = ReentrantLock()
    private val clientesWs = CopyOnWriteArrayList<WebSocket>()
    private val agendador = Executors.newSingleThreadScheduledExecutor()

    private var sessaoCriadaEm: Long = System.currentTimeMillis()
    private var pendentes = mutableListOf<Visitante>()
    private var confirmados = mutableListOf<Visitante>()
    private var resumoFinal: Map<String, Any>? = null

    init {
        carregarEstado()
    }

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
            salvarEstado()
            return true
        }
        return false
    }

    // Grava o estado completo (inclui nomes) de forma atomica: escreve num arquivo
    // temporario e troca. Falha de disco nunca derruba o servidor.
    private fun salvarEstado() {
        val destino = arquivoEstado ?: return
        try {
            val obj = JSONObject()
            lock.withLock {
                obj.put("sessaoCriadaEm", sessaoCriadaEm)
                obj.put("pendentes", JSONArray(pendentes.map { visitanteJson(it) }))
                obj.put("confirmados", JSONArray(confirmados.map { visitanteJson(it) }))
                obj.put("resumoFinal", resumoFinal?.let { JSONObject(it) } ?: JSONObject.NULL)
            }
            destino.parentFile?.mkdirs()
            val temporario = File(destino.path + ".tmp")
            temporario.writeText(obj.toString(), Charsets.UTF_8)
            if (!temporario.renameTo(destino)) {
                destino.delete()
                temporario.renameTo(destino)
            }
        } catch (e: Exception) {
            // sem espaco/permissao: o app continua funcionando so em memoria
        }
    }

    // Recarrega a sessao salva. Arquivo ausente ou corrompido: comeca limpo. Se a
    // sessao ja passou de 10h, verificarExpiracao() descarta os nomes e regrava o
    // arquivo so com o resumo anonimo.
    private fun carregarEstado() {
        val origem = arquivoEstado ?: return
        try {
            if (!origem.exists()) return
            val obj = JSONObject(origem.readText(Charsets.UTF_8))
            val lerLista = { chave: String ->
                val arr = obj.optJSONArray(chave) ?: JSONArray()
                val lista = mutableListOf<Visitante>()
                for (i in 0 until arr.length()) {
                    val v = arr.getJSONObject(i)
                    lista.add(
                        Visitante(
                            id = v.getString("id"),
                            nome = v.getString("nome"),
                            igreja = v.getString("igreja"),
                            local = v.getString("local"),
                            cargo = v.getString("cargo"),
                            criadoEm = v.getLong("criadoEm")
                        )
                    )
                }
                lista
            }
            val criada = obj.getLong("sessaoCriadaEm")
            val ps = lerLista("pendentes")
            val cs = lerLista("confirmados")
            var resumo: Map<String, Any>? = null
            val r = obj.optJSONObject("resumoFinal")
            if (r != null) {
                val m = mutableMapOf<String, Any>()
                for (k in r.keys()) m[k] = r.get(k)
                resumo = m
            }
            lock.withLock {
                sessaoCriadaEm = criada
                pendentes = ps
                confirmados = cs
                resumoFinal = resumo
                verificarExpiracao()
            }
        } catch (e: Exception) {
            // arquivo corrompido: ignora e segue com sessao nova
        }
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
        salvarEstado()
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

        // Le o corpo direto dos bytes e decodifica como UTF-8. O parseBody do NanoHTTPD
        // assume US-ASCII quando o Content-Type nao traz charset (acentos viram lixo)
        // e nao le o corpo de requisicoes PATCH (a correcao de pendentes ficava vazia).
        fun corpoJson(): JSONObject {
            val tamanho = session.headers["content-length"]?.toIntOrNull() ?: 0
            if (tamanho <= 0) return JSONObject()
            val bytes = ByteArray(tamanho)
            var lidos = 0
            while (lidos < tamanho) {
                val n = session.inputStream.read(bytes, lidos, tamanho - lidos)
                if (n < 0) break
                lidos += n
            }
            return JSONObject(String(bytes, 0, lidos, Charsets.UTF_8))
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
