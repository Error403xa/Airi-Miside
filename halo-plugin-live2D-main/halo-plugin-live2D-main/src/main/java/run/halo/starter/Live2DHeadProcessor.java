package run.halo.starter;

import java.util.Map;
import org.springframework.stereotype.Component;
import org.thymeleaf.context.ITemplateContext;
import org.thymeleaf.model.IModel;
import org.thymeleaf.model.IModelFactory;
import org.thymeleaf.model.AttributeValueQuotes;
import org.thymeleaf.processor.element.IElementModelStructureHandler;
import reactor.core.publisher.Mono;
import run.halo.app.theme.dialect.TemplateHeadProcessor;

/**
 * Live2D 前台脚本注入处理器
 *
 * 通过 TemplateHeadProcessor 扩展点向主题的 <head> 标签注入 Live2D 初始化脚本
 *
 * @author Live2D Plugin
 */
@Component
public class Live2DHeadProcessor implements TemplateHeadProcessor {

    @Override
    public Mono<Void> process(ITemplateContext context, IModel model,
            IElementModelStructureHandler structureHandler) {

        final IModelFactory modelFactory = context.getModelFactory();

        // 注入 Live2D 前台初始化脚本
        // 通过 ReverseProxy 访问插件的 static 目录
        // 路径格式: /plugins/{plugin-name}/assets/{file-path}
        Map<String, String> attributes = Map.of(
            "src", "/plugins/MiSide_live2d/assets/frontend-live2d.js",
            "type", "module"
        );

        model.add(modelFactory.createOpenElementTag("script", attributes,
            AttributeValueQuotes.DOUBLE, false));
        model.add(modelFactory.createCloseElementTag("script"));

        return Mono.empty();
    }
}
